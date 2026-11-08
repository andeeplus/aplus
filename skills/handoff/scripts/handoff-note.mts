/**
 * Prints where a branch's handoff note lives, creating its folder, or lists the notes there.
 *
 * Usage: node --experimental-strip-types handoff-note.mts [--branch <name>] [--list]
 *
 * Notes live in `<audit dir>/handoffs/<branch>.md`, where the audit dir is the first entry of `APLUS_AUDIT_DIRS` (from
 * the environment or the repository's root `.env`), defaulting to `.audit`, and `{project}` becomes the repository's
 * name. A relative audit dir resolves against the primary checkout, so every worktree shares one note and removing a
 * worktree keeps it. It stops when the dir is inside the repository and not gitignored.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

function git(cwd: string, args: string[]): string {
	return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

/** The repository's name: the last part of the `origin` URL, else the primary checkout's folder name. */
export function projectName(primary: string): string {
	let remote = '';
	try {
		remote = git(primary, ['remote', 'get-url', 'origin']);
	} catch {}
	const name =
		remote
			.replace(/\.git$/, '')
			.split(/[/:\\]/)
			.pop() || path.basename(primary);
	return name.replace(/[^\w.-]/g, '-');
}

/** The handoffs folder: `handoffs/` under the first `APLUS_AUDIT_DIRS` entry, or `.audit`, from the primary checkout. */
export function handoffDir(value: string | undefined, primary: string, project: string): string {
	const first =
		(value ?? '')
			.split(',')
			.map((entry) => entry.trim())
			.find(Boolean) ?? '.audit';
	return path.resolve(primary, first.replaceAll('{project}', project), 'handoffs');
}

/** The primary checkout of the repository at `cwd`, and the handoffs folder after reading `.env`. */
export function locate(cwd: string): { primary: string; dir: string } {
	const toplevel = git(cwd, ['rev-parse', '--show-toplevel']);
	const primary = path.dirname(realpathSync(git(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir'])));
	for (const root of new Set([toplevel, primary])) {
		try {
			process.loadEnvFile(path.join(root, '.env'));
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
		}
	}
	return { primary, dir: handoffDir(process.env.APLUS_AUDIT_DIRS, primary, projectName(primary)) };
}

/** The branches with a note in `dir`, such as `fix/thing` for `fix/thing.md`. */
export function listNotes(dir: string, prefix = ''): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const name = path.posix.join(prefix, entry.name);
		if (entry.isDirectory()) return listNotes(path.join(dir, entry.name), name);
		return entry.name.endsWith('.md') ? [name.slice(0, -3)] : [];
	});
}

const isMain = process.argv[1] !== undefined && realpathSync(process.argv[1]) === import.meta.filename;

if (isMain) {
	try {
		const { values } = parseArgs({
			options: { branch: { type: 'string' }, list: { type: 'boolean', default: false } },
		});
		const cwd = process.env.INIT_CWD ?? process.cwd();
		const { primary, dir } = locate(cwd);
		const rel = path.relative(primary, dir);
		if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
			try {
				execFileSync('git', ['check-ignore', '-q', `${rel}/`], { cwd: primary });
			} catch {
				throw new Error(`${rel}/ is not gitignored. Ask the user before adding it to .gitignore.`);
			}
		}
		if (values.list) {
			const notes = listNotes(dir);
			if (!notes.length) throw new Error(`No handoff note in ${dir}`);
			for (const branch of notes) console.log(`${branch}\t${path.join(dir, `${branch}.md`)}`);
		} else {
			const branch = values.branch ?? git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
			const note = path.join(dir, `${branch}.md`);
			mkdirSync(path.dirname(note), { recursive: true });
			console.log(note);
		}
	} catch (error) {
		console.error(`[error] ${error instanceof Error ? error.message : error}`);
		process.exit(1);
	}
}
