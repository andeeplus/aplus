/**
 * Creates an audit's files under `<audit dir>/<scope-slug>/<YYYY-MM-DD>/` from the templates in `../assets/`.
 *
 * Usage: node --experimental-strip-types new-audit.mts <scope-slug> --author <slug> --model <name>
 *        [--posture strict|balanced] [--review]
 *        node --experimental-strip-types new-audit.mts --sync
 *        node --experimental-strip-types new-audit.mts --find [scope-slug]
 *        node --experimental-strip-types new-audit.mts --excerpt <date-folder> <key>...
 *
 * Without `--review` it starts the audit: `README.md`, `bugs.md` and, for `strict`, `program.md`, `notes.md`
 * and `issues/`. With `--review` it adds `review-<author>.md` to the audit already started for that scope.
 * `--sync` copies the working copy to every mirror; with no mirror it does nothing. Creating files syncs too.
 * `--find` prints the audits in the working copy, or the one for a scope, and exits 1 when there are none.
 *
 * The audit dirs come from `APLUS_AUDIT_DIRS` in the environment or the repository's root `.env`, a list separated by
 * commas. The first is the working copy and defaults to `.audit`;
 * the others are mirrors. `{project}` in an entry becomes the repository's name. Run it from inside the repository.
 * It stops when a dir inside the repository is not gitignored.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const DATE_FOLDER = /^\d{4}-\d{2}-\d{2}$/;

/** Fills a template's placeholders; the rest of the text, such as `{one sentence}`, is left to write. */
export function fill(template: string, values: Record<string, string>): string {
	return Object.entries(values).reduce(
		(text, [name, value]) => text.replaceAll(new RegExp(`\\{ ?${name} ?\\}`, 'g'), value),
		template,
	);
}

/** An audit program lives in the folder of its first day; `existing` are the date folders already there. */
export function pickDate(existing: string[], today: string, review: boolean): string {
	const first = existing.filter((name) => DATE_FOLDER.test(name)).sort()[0];
	if (review && !first) throw new Error('No audit for this scope yet. Start it without --review.');
	if (!review && first) throw new Error(`This scope's audit started on ${first}. Add another author with --review.`);
	return first ?? today;
}

/** The repository's name: the last part of the `origin` URL, else the root folder's name; safe as a folder name. */
export function projectName(root: string): string {
	let remote = '';
	try {
		remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
			cwd: root,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim();
	} catch {}
	const name =
		remote
			.replace(/\.git$/, '')
			.split(/[/:\\]/)
			.pop() || path.basename(root);
	return name.replace(/[^\w.-]/g, '-');
}

/** The audit dirs from `APLUS_AUDIT_DIRS`, absolute; the first is the working copy, the rest mirrors. */
export function auditDirs(value: string | undefined, root: string, project: string): string[] {
	const entries = (value ?? '')
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean);
	return (entries.length ? entries : ['.audit']).map((entry) =>
		path.resolve(root, entry.replaceAll('{project}', project)),
	);
}

/** The audits in `dir` as `<scope>/<date>` paths, for one scope or all; empty when the dir or scope is missing. */
export function findAudits(dir: string, scope?: string): string[] {
	if (!existsSync(dir)) return [];
	const scopes = scope ? [scope] : readdirSync(dir);
	return scopes.flatMap((name) => {
		const scopeDir = path.join(dir, name);
		if (!existsSync(scopeDir)) return [];
		return readdirSync(scopeDir)
			.filter((entry) => DATE_FOLDER.test(entry))
			.sort()
			.map((date) => path.join(scopeDir, date));
	});
}

type Section = { key: string; level: number; text: string };

/** Headings `## KEY:` and `### KEY:` through the next heading of the same or higher level. */
function sections(markdown: string): Section[] {
	const lines = markdown.split('\n');
	const heads: { index: number; level: number; key: string }[] = [];
	for (let index = 0; index < lines.length; index++) {
		const match = /^(#{2,3}) ([^:\s]+):/.exec(lines[index]);
		if (match) heads.push({ index, level: match[1].length, key: match[2] });
	}
	return heads.map((head, index) => {
		let end = lines.length;
		for (let next = index + 1; next < heads.length; next++) {
			if (heads[next].level <= head.level) {
				end = heads[next].index;
				break;
			}
		}
		return { key: head.key, level: head.level, text: lines.slice(head.index, end).join('\n') };
	});
}

/** The sections of `bugs.md` and `program.md` named by `keys`, in the order the files list them. */
export function excerpt(files: { name: string; text: string }[], keys: string[]): string {
	const wanted = new Set(keys);
	const found = new Set<string>();
	const parts: string[] = [];
	for (const file of files) {
		for (const section of sections(file.text)) {
			if (!wanted.has(section.key)) continue;
			found.add(section.key);
			parts.push(section.text.trimEnd());
		}
	}
	const missing = keys.filter((key) => !found.has(key));
	if (missing.length > 0) throw new Error(`No audit section for ${missing.join(', ')}`);
	return `${parts.join('\n\n')}\n`;
}

/** Copies the working copy over each mirror. It never deletes, so a mirror keeps what the working copy loses. */
export function sync(dirs: string[]): void {
	const [primary, ...mirrors] = dirs;
	for (const mirror of mirrors) {
		if (mirror === primary) continue;
		cpSync(primary, mirror, { recursive: true, force: true });
		console.log(`synced ${mirror}`);
	}
}

function create(file: string, content: string): void {
	if (existsSync(file)) throw new Error(`${file} already exists`);
	writeFileSync(file, content);
	console.log(`created ${file}`);
}

const isMain = process.argv[1] !== undefined && path.resolve(process.argv[1]) === import.meta.filename;

if (isMain) {
	try {
		const { values, positionals } = parseArgs({
			args: process.argv.slice(2).filter((arg) => arg !== '--'),
			options: {
				author: { type: 'string' },
				model: { type: 'string' },
				posture: { type: 'string', default: 'strict' },
				review: { type: 'boolean', default: false },
				sync: { type: 'boolean', default: false },
				find: { type: 'boolean', default: false },
				excerpt: { type: 'string' },
			},
			allowPositionals: true,
		});
		const [scope] = positionals;
		const usage =
			'Usage: new-audit.mts <scope-slug> --author <slug> --model <name> [--posture strict|balanced] [--review]\n       new-audit.mts --sync\n       new-audit.mts --find [scope-slug]\n       new-audit.mts --excerpt <date-folder> <key>...';
		const cwd = process.env.INIT_CWD ?? process.cwd();
		if (values.excerpt) {
			if (positionals.length === 0) throw new Error(usage);
			const dir = path.resolve(cwd, values.excerpt);
			const files = ['bugs.md', 'program.md']
				.filter((name) => existsSync(path.join(dir, name)))
				.map((name) => ({ name, text: readFileSync(path.join(dir, name), 'utf8') }));
			if (files.length === 0) throw new Error(`No bugs.md or program.md in ${dir}`);
			process.stdout.write(excerpt(files, positionals));
			process.exit(0);
		}
		if (
			!values.sync &&
			!values.find &&
			!values.excerpt &&
			(!scope || !values.author || !values.model || !['strict', 'balanced'].includes(values.posture))
		) {
			throw new Error(usage);
		}
		const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' }).trim();
		try {
			process.loadEnvFile(path.join(root, '.env'));
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
		}
		const dirs = auditDirs(process.env.APLUS_AUDIT_DIRS, root, projectName(root));
		if (values.find) {
			const found = findAudits(dirs[0], scope);
			if (!found.length) throw new Error(`No audit in ${dirs[0]}`);
			console.log(found.join('\n'));
			process.exit(0);
		}
		for (const dir of dirs) {
			const rel = path.relative(root, dir);
			if (rel.startsWith('..') || path.isAbsolute(rel)) continue;
			try {
				execFileSync('git', ['check-ignore', '-q', `${rel}/`], { cwd: root });
			} catch {
				throw new Error(`${rel}/ is not gitignored. Ask the user before adding it to .gitignore.`);
			}
		}
		if (values.sync) {
			if (!existsSync(dirs[0])) throw new Error(`No audit in ${dirs[0]}`);
			sync(dirs);
			process.exit(0);
		}
		const author = values.author as string;
		const model = values.model as string;
		const scopeDir = path.join(dirs[0], scope);
		const existing = existsSync(scopeDir) ? readdirSync(scopeDir) : [];
		const date = pickDate(existing, new Date().toLocaleDateString('sv'), values.review);
		const dir = path.join(scopeDir, date);
		mkdirSync(dir, { recursive: true });

		const assets = path.join(import.meta.dirname, '../assets');
		const placeholders = {
			'scope-slug': scope,
			'YYYY-MM-DD': date,
			'author-slug': author,
			'model-name': model,
			'strict \\| balanced': values.posture,
			posture: values.posture,
		};
		const template = (name: string) => fill(readFileSync(path.join(assets, name), 'utf8'), placeholders);
		if (values.review) {
			create(path.join(dir, `review-${author}.md`), template('review.md'));
		} else {
			create(path.join(dir, 'README.md'), template('readme.md'));
			create(path.join(dir, 'bugs.md'), '# Bugs\n');
			if (values.posture === 'strict') {
				create(path.join(dir, 'program.md'), '# Program\n');
				create(path.join(dir, 'notes.md'), '# Notes\n');
				mkdirSync(path.join(dir, 'issues'), { recursive: true });
			}
		}
		sync(dirs);
	} catch (error) {
		console.error(`[error] ${error instanceof Error ? error.message : error}`);
		process.exit(1);
	}
}
