/**
 * Validates issue drafts against a Jira project and, with `--apply`, creates and links them.
 *
 * Usage: node --experimental-strip-types create-issues.mts <file.md | folder> [more files] --project KEY [--apply]
 *
 * Draft format: ../../github/references/issues.md, with `template` set to the Jira issue type (such as Bug or
 * Task) and no form sections. Drafts and their `manifest.json` share one folder. Needs `atlassian-cli` with a
 * Jira profile.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

export type Draft = {
	file: string;
	key: string;
	template: string;
	title: string;
	labels: string[];
	parent?: string;
	blockedBy: string[];
	body: string;
};

export type FieldMeta = { fieldId: string; name: string; required: boolean; hasDefaultValue: boolean };

type ManifestEntry = { jira: string; bodyResolved?: boolean; blockedByLinked?: string[] };
type Manifest = Record<string, ManifestEntry>;
type IssueLink = { id: string; type: { name: string }; inwardIssue?: { key: string }; outwardIssue?: { key: string } };

const KEY_TOKEN = /#\{([A-Za-z0-9_-]+)\}/g;
const JIRA_KEY = /\b[A-Z][A-Z0-9]+-\d+\b/;
// Fields the script fills itself, or Jira fills when the draft leaves them out.
const PROVIDED = new Set(['project', 'issuetype', 'summary', 'description', 'labels', 'parent', 'reporter']);

function list(value: string | undefined): string[] {
	return (value ?? '')
		.replace(/^\[|\]$/g, '')
		.split(',')
		.map((item) => item.trim().replace(/^(['"])(.*)\1$/, '$2'))
		.filter(Boolean);
}

export function parseDraft(file: string, source: string): Draft {
	const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(source);
	if (!match) throw new Error(`${file}: missing frontmatter`);
	const front = new Map(
		match[1].split('\n').flatMap((line) => {
			const pair = /^(\w+):[ \t]*(.*)$/.exec(line);
			return pair ? [[pair[1], pair[2].trim()] as const] : [];
		}),
	);
	const text = (name: string) => list(front.get(name))[0];
	return {
		file,
		key: text('key') ?? path.basename(file, '.md'),
		template: text('template') ?? '',
		title: front.get('title') ?? '',
		labels: list(front.get('labels')),
		parent: text('parent'),
		blockedBy: list(front.get('blockedBy')),
		body: match[2].trim(),
	};
}

/** Required fields the project's issue type needs that neither the draft nor Jira's defaults provide. */
export function unsetRequired(fields: FieldMeta[]): string[] {
	return fields
		.filter((field) => field.required && !field.hasDefaultValue && !PROVIDED.has(field.fieldId))
		.map((field) => field.name);
}

export function validateDrafts(drafts: Draft[], types: Map<string, FieldMeta[]>, created: Set<string>): string[] {
	const keys = new Set(drafts.map((draft) => draft.key));
	const seen = new Set<string>();
	const errors = drafts.flatMap((draft) => {
		const meta = types.get(draft.template);
		const problems = [
			...(seen.has(draft.key) ? [`duplicate key ${draft.key}`] : []),
			...(draft.title ? [] : ['title is required']),
			...(meta
				? unsetRequired(meta).map(
						(name) => `the project requires "${name}"; create this issue with the CLI's --field`,
					)
				: [`template must be one of ${[...types.keys()].join(', ')}`]),
			...[
				...(draft.parent ? [draft.parent] : []),
				...draft.blockedBy,
				...Array.from(draft.body.matchAll(KEY_TOKEN), (token) => token[1]),
			]
				.filter((key) => !keys.has(key) && !created.has(key))
				.map((key) => `unknown key ${key}`),
			...(draft.body.includes('.audit/') ? ['links to .audit/, which is not published'] : []),
		];
		seen.add(draft.key);
		return problems.map((problem) => `${draft.file}: ${problem}`);
	});
	try {
		orderDrafts(drafts);
	} catch (error) {
		errors.push((error as Error).message);
	}
	return errors;
}

/** Parents and blockers come first. Throws on a cycle. */
export function orderDrafts(drafts: Draft[]): Draft[] {
	const byKey = new Map(drafts.map((draft) => [draft.key, draft]));
	const state = new Map<string, 'visiting' | 'done'>();
	const ordered: Draft[] = [];
	const visit = (draft: Draft) => {
		if (state.get(draft.key) === 'done') return;
		if (state.get(draft.key) === 'visiting') throw new Error(`${draft.file}: parent or blockedBy cycle`);
		state.set(draft.key, 'visiting');
		for (const key of [draft.parent, ...draft.blockedBy]) {
			const dependency = key ? byKey.get(key) : undefined;
			if (dependency) visit(dependency);
		}
		state.set(draft.key, 'done');
		ordered.push(draft);
	};
	drafts.forEach(visit);
	return ordered;
}

export function resolveTokens(body: string, manifest: Manifest): string {
	return body.replace(KEY_TOKEN, (token, key: string) => manifest[key]?.jira ?? token);
}

/**
 * Whether the "blocked" issue's links show the blocker the right way round: its own link list has the blocker
 * as `inwardIssue` ("is blocked by"). An `outwardIssue` means the link was created inverted.
 */
export function linkState(
	blockedLinks: IssueLink[],
	blocker: string,
): { state: 'right' | 'inverted' | 'missing'; id?: string } {
	const link = blockedLinks.find(
		(candidate) =>
			candidate.type.name === 'Blocks' &&
			(candidate.inwardIssue?.key === blocker || candidate.outwardIssue?.key === blocker),
	);
	if (!link) return { state: 'missing' };
	return { state: link.inwardIssue?.key === blocker ? 'right' : 'inverted', id: link.id };
}

const hasToken = (body: string) => body.search(KEY_TOKEN) !== -1;

function cli(...args: string[]): string {
	return execFileSync('atlassian-cli', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

function api<T>(endpoint: string): T {
	return JSON.parse(cli('-f', 'json', 'jira', 'api', endpoint)) as T;
}

function readTypes(project: string): Map<string, FieldMeta[]> {
	const { issueTypes } = api<{ issueTypes: Array<{ id: string; name: string }> }>(
		`/rest/api/3/issue/createmeta/${project}/issuetypes`,
	);
	return new Map(
		issueTypes.map(({ id, name }) => [
			name,
			api<{ fields: FieldMeta[] }>(`/rest/api/3/issue/createmeta/${project}/issuetypes/${id}`).fields,
		]),
	);
}

function createIssue(draft: Draft, project: string, manifest: Manifest): string {
	const parent = draft.parent ? manifest[draft.parent]?.jira : undefined;
	if (draft.parent && !parent) throw new Error(`${draft.file}: create parent ${draft.parent} first`);
	const output = cli(
		'jira',
		'issue',
		'create',
		'--project',
		project,
		'--issue-type',
		draft.template,
		'--summary',
		draft.title,
		'--description',
		resolveTokens(draft.body, manifest),
		...(draft.labels.length > 0 ? ['--field', `labels=${JSON.stringify(draft.labels)}`] : []),
		...(parent ? ['--field', `parent=${JSON.stringify({ key: parent })}`] : []),
	);
	const created = JIRA_KEY.exec(output)?.[0];
	if (!created) throw new Error(`${draft.file}: could not read the new issue key from: ${output.trim()}`);
	return created;
}

function blockedLinks(blocked: string): IssueLink[] {
	return api<{ fields: { issuelinks: IssueLink[] } }>(`/rest/api/3/issue/${blocked}?fields=issuelinks`).fields
		.issuelinks;
}

/** Creates a "blocks" link and reads it back; an inverted link is deleted and created the other way round. */
function linkBlocker(blocker: string, blocked: string): void {
	cli('jira', 'issue', 'links', 'create', blocker, blocked, '--link-type', 'Blocks');
	let result = linkState(blockedLinks(blocked), blocker);
	if (result.state === 'inverted' && result.id) {
		cli('jira', 'issue', 'links', 'delete', result.id);
		cli('jira', 'issue', 'links', 'create', blocked, blocker, '--link-type', 'Blocks');
		result = linkState(blockedLinks(blocked), blocker);
	}
	if (result.state !== 'right') throw new Error(`${blocked}: could not make it "blocked by" ${blocker}`);
}

function apply(project: string, ordered: Draft[], pool: Draft[], manifest: Manifest, manifestPath: string): void {
	const save = () => writeFileSync(manifestPath, `${JSON.stringify(manifest, null, '\t')}\n`);
	for (const draft of ordered.filter((candidate) => !manifest[candidate.key])) {
		const body = resolveTokens(draft.body, manifest);
		manifest[draft.key] = { jira: createIssue(draft, project, manifest), bodyResolved: !hasToken(body) };
		save();
		console.log(`[issue] ${manifest[draft.key].jira} ${draft.title}`);
	}
	for (const draft of pool.filter((candidate) => manifest[candidate.key])) {
		const entry = manifest[draft.key];
		if (!entry.bodyResolved) {
			const body = resolveTokens(draft.body, manifest);
			cli('jira', 'issue', 'update', entry.jira, '--description', body);
			entry.bodyResolved = !hasToken(body);
		}
		const linked = new Set(entry.blockedByLinked ?? []);
		for (const blocker of draft.blockedBy.filter((key) => !linked.has(key) && manifest[key])) {
			linkBlocker(manifest[blocker].jira, entry.jira);
			linked.add(blocker);
			entry.blockedByLinked = [...linked];
			save();
		}
	}
}

function run(task: () => void): void {
	try {
		task();
	} catch (error) {
		console.error(`[error] ${error instanceof Error ? error.message : error}`);
		process.exit(1);
	}
}

const isMain = process.argv[1] !== undefined && realpathSync(process.argv[1]) === import.meta.filename;

if (isMain)
	run(() => {
		const { values, positionals } = parseArgs({
			args: process.argv.slice(2).filter((arg) => arg !== '--'),
			options: { project: { type: 'string' }, apply: { type: 'boolean', default: false } },
			allowPositionals: true,
		});
		if (positionals.length === 0 || !values.project) {
			throw new Error('Usage: create-issues.mts <file.md | folder> [more files] --project KEY [--apply]');
		}
		const cwd = process.env.INIT_CWD ?? process.cwd();
		const inputs = positionals.map((input) => {
			const file = path.resolve(cwd, input);
			return { file, isDirectory: statSync(file).isDirectory() };
		});
		const dirs = new Set(inputs.map(({ file, isDirectory }) => (isDirectory ? file : path.dirname(file))));
		if (dirs.size > 1)
			throw new Error('Pass drafts from one folder at a time; its manifest.json tracks what exists.');
		const [dir] = dirs;
		const pool = readdirSync(dir)
			.filter((file) => file.endsWith('.md'))
			.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
			.map((file) => parseDraft(file, readFileSync(path.join(dir, file), 'utf8')));
		const files = new Set(inputs.filter(({ isDirectory }) => !isDirectory).map(({ file }) => path.basename(file)));
		const selected = files.size > 0 ? pool.filter((draft) => files.has(draft.file)) : pool;
		const manifestPath = path.join(dir, 'manifest.json');
		const manifest: Manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

		const errors = validateDrafts(selected, readTypes(values.project), new Set(Object.keys(manifest)));
		if (errors.length > 0) {
			for (const error of errors) console.error(`[error] ${error}`);
			process.exit(1);
		}
		const ordered = orderDrafts(selected);
		for (const draft of ordered) {
			const links = [
				draft.parent && `parent ${draft.parent}`,
				draft.blockedBy.length > 0 && `blocked by ${draft.blockedBy.join(', ')}`,
			]
				.filter(Boolean)
				.join('; ');
			console.log(
				`${(manifest[draft.key]?.jira ?? 'new').padEnd(10)} ${draft.key.padEnd(4)} ${draft.template.padEnd(8)} ${draft.title}${links ? ` (${links})` : ''}`,
			);
		}
		console.log(`\n${ordered.length} drafts valid.`);
		if (values.apply) apply(values.project, ordered, pool, manifest, manifestPath);
		else console.log('Dry run. Add --apply to create the new ones.');
	});
