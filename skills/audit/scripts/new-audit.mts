/**
 * Creates an audit's files under `.audit/<scope-slug>/<YYYY-MM-DD>/` from the templates in `../assets/`.
 *
 * Usage: node --experimental-strip-types new-audit.mts <scope-slug> --author <slug> --model <name>
 *        [--posture strict|balanced] [--review]
 *
 * Without `--review` it starts the audit: `README.md`, `bugs.md` and, for `strict`, `program.md`, `notes.md`
 * and `issues/`. With `--review` it adds `review-<author>.md` to the audit already started for that scope.
 * Run it from inside the repository. It stops when `.audit/` is not gitignored.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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
			},
			allowPositionals: true,
		});
		const [scope] = positionals;
		if (!scope || !values.author || !values.model || !['strict', 'balanced'].includes(values.posture)) {
			throw new Error(
				'Usage: new-audit.mts <scope-slug> --author <slug> --model <name> [--posture strict|balanced] [--review]',
			);
		}
		const cwd = process.env.INIT_CWD ?? process.cwd();
		const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' }).trim();
		try {
			execFileSync('git', ['check-ignore', '-q', '.audit/'], { cwd: root });
		} catch {
			throw new Error('.audit/ is not gitignored. Ask the user before adding it to .gitignore.');
		}
		const scopeDir = path.join(root, '.audit', scope);
		const existing = existsSync(scopeDir) ? readdirSync(scopeDir) : [];
		const date = pickDate(existing, new Date().toLocaleDateString('sv'), values.review);
		const dir = path.join(scopeDir, date);
		mkdirSync(dir, { recursive: true });

		const assets = path.join(import.meta.dirname, '../assets');
		const placeholders = {
			'scope-slug': scope,
			'YYYY-MM-DD': date,
			'author-slug': values.author,
			'model-name': values.model,
			'strict \\| balanced': values.posture,
			posture: values.posture,
		};
		const template = (name: string) => fill(readFileSync(path.join(assets, name), 'utf8'), placeholders);
		if (values.review) {
			create(path.join(dir, `review-${values.author}.md`), template('review.md'));
		} else {
			create(path.join(dir, 'README.md'), template('readme.md'));
			create(path.join(dir, 'bugs.md'), '# Bugs\n');
			if (values.posture === 'strict') {
				create(path.join(dir, 'program.md'), '# Program\n');
				create(path.join(dir, 'notes.md'), '# Notes\n');
				mkdirSync(path.join(dir, 'issues'), { recursive: true });
			}
		}
	} catch (error) {
		console.error(`[error] ${error instanceof Error ? error.message : error}`);
		process.exit(1);
	}
}
