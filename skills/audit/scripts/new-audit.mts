/**
 * Creates an audit's files under `<audit dir>/<scope-slug>/<YYYY-MM-DD>/` from the templates in `../assets/`.
 *
 * Usage: node --experimental-strip-types new-audit.mts <scope-slug> --author <slug> --model <name>
 *        [--posture strict|balanced] [--review]
 *        node --experimental-strip-types new-audit.mts --sync
 *
 * Without `--review` it starts the audit: `README.md`, `bugs.md` and, for `strict`, `program.md`, `notes.md`
 * and `issues/`. With `--review` it adds `review-<author>.md` to the audit already started for that scope.
 * `--sync` copies the working copy to every mirror; with no mirror it does nothing. Creating files syncs too.
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
			},
			allowPositionals: true,
		});
		const [scope] = positionals;
		const usage =
			'Usage: new-audit.mts <scope-slug> --author <slug> --model <name> [--posture strict|balanced] [--review]\n       new-audit.mts --sync';
		if (
			!values.sync &&
			(!scope || !values.author || !values.model || !['strict', 'balanced'].includes(values.posture))
		) {
			throw new Error(usage);
		}
		const cwd = process.env.INIT_CWD ?? process.cwd();
		const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' }).trim();
		try {
			process.loadEnvFile(path.join(root, '.env'));
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
		}
		const dirs = auditDirs(process.env.APLUS_AUDIT_DIRS, root, projectName(root));
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
