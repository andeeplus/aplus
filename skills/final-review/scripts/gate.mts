/**
 * Measures a change for final-review, and keeps its verdict so a later run on the same diff can reuse it.
 *
 * Usage: node --experimental-strip-types gate.mts facts --base <ref>
 *        node --experimental-strip-types gate.mts read --base <ref> [--all]
 *        node --experimental-strip-types gate.mts write --base <ref> --verdict "<ready to ship|not ready>" --reviews <all|none|list> [--reason "<one line>"]
 *
 * Run it from inside the repository. `<ref>` is the base the change targets, such as `origin/<integration branch>`.
 * The change is the working tree against the merge base, plus untracked files. `facts` prints its size, as advice for
 * the agent's choice of reviews. `--reviews` is `all`, `none`, or a comma-separated list of `tests`, `quality`, `docs`
 * and `second-opinion`. `write` stamps a verdict, and refuses to skip a review without a reason. `read` prints the
 * stamped verdict, reviews and reason when the change is the one stamped, and exits 1 otherwise; with `--all`, a stamp
 * that skipped a review does not count. The stamp lives under the common git dir, shared by every worktree.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

export const MAX_FILES = 4;
export const MAX_LINES = 60;

export const REVIEWS = ['tests', 'quality', 'docs', 'second-opinion'] as const;
export type Review = (typeof REVIEWS)[number];

const VERDICTS = ['ready to ship', 'not ready'] as const;
export type Verdict = (typeof VERDICTS)[number];

export type DiffFile = {
	status: string;
	path: string;
	oldPath?: string;
	additions: number;
	deletions: number;
	binary: boolean;
};

export type Stamp = { id: string; verdict: Verdict; reviews: Review[]; reason?: string };

type NamedFile = { status: string; path: string; oldPath?: string };
type Counts = { additions: number; deletions: number; binary: boolean };

/** Drops the empty record a trailing NUL leaves. */
function records(raw: string): string[] {
	const parts = raw.split('\0');
	if (parts.at(-1) === '') parts.pop();
	return parts;
}

/** Parses `git diff -z --name-status`. A rename or copy is status, old path, new path. */
export function parseNameStatus(raw: string): NamedFile[] {
	const parts = records(raw);
	const files: NamedFile[] = [];
	for (let i = 0; i < parts.length;) {
		const status = parts[i++];
		const paired = status.startsWith('R') || status.startsWith('C');
		const oldPath = paired ? parts[i++] : undefined;
		const filePath = parts[i++];
		if (!status || !filePath || (paired && !oldPath)) throw new Error('Bad name-status record');
		files.push(oldPath ? { status, path: filePath, oldPath } : { status, path: filePath });
	}
	return files;
}

/** Parses `git diff -z --numstat`, keyed by the new path. A `-` count is a binary file. */
export function parseNumstat(raw: string): Map<string, Counts> {
	const parts = records(raw);
	const counts = new Map<string, Counts>();
	for (let i = 0; i < parts.length;) {
		const match = /^(-|\d+)\t(-|\d+)\t(.*)$/.exec(parts[i++]);
		if (!match) throw new Error('Bad numstat record');
		let filePath = match[3];
		if (filePath === '') {
			i++;
			filePath = parts[i++];
			if (!filePath) throw new Error('Bad numstat rename');
		}
		const binary = match[1] === '-';
		counts.set(filePath, {
			additions: binary ? 0 : Number(match[1]),
			deletions: binary ? 0 : Number(match[2]),
			binary,
		});
	}
	return counts;
}

/** Joins a name-status parse with its numstat. A path with no count fails, so no file goes unmeasured. */
export function withCounts(named: NamedFile[], counts: Map<string, Counts>): DiffFile[] {
	return named.map((file) => {
		const count = counts.get(file.path);
		if (!count) throw new Error(`No line count for ${file.path}`);
		return { ...file, ...count };
	});
}

/** A test file is `*.test.*`, `*.spec.*`, `*_test.*`, or anything under `__tests__`. */
export function isTestPath(file: string): boolean {
	const normalized = file.replaceAll('\\', '/');
	const base = path.posix.basename(normalized);
	return (
		/\.(test|spec)\.[^.]+$/.test(base) || /_test\.[^.]+$/.test(base) || normalized.split('/').includes('__tests__')
	);
}

/** Prose, such as a README or a release note. */
export function isDocPath(file: string): boolean {
	return /\.(md|mdx|rst|txt|adoc)$/i.test(file);
}

function directory(file: string): string {
	return path.posix.dirname(file.replaceAll('\\', '/'));
}

export function changedLines(files: DiffFile[]): number {
	return files.reduce((sum, file) => sum + file.additions + file.deletions, 0);
}

/** What makes a change more than small, as advice; empty when it is small. A new test or doc is not new source. */
export function blockers(files: DiffFile[]): string[] {
	const reasons: string[] = [];
	if (files.length > MAX_FILES) reasons.push(`${files.length} files, over ${MAX_FILES}`);
	const lines = changedLines(files);
	if (lines > MAX_LINES) reasons.push(`${lines} lines, over ${MAX_LINES}`);
	for (const file of files) {
		if (file.binary) reasons.push(`binary file: ${file.path}`);
		else if (file.status.startsWith('C')) reasons.push(`copied file: ${file.oldPath} -> ${file.path}`);
		else if (file.status.startsWith('R')) {
			if (directory(file.oldPath ?? '') !== directory(file.path))
				reasons.push(`moved across directories: ${file.oldPath} -> ${file.path}`);
		} else if (file.status.startsWith('A')) {
			if (!isTestPath(file.path) && !isDocPath(file.path)) reasons.push(`new source file: ${file.path}`);
		} else if (!/^[MD]/.test(file.status)) reasons.push(`${file.status} change: ${file.path}`);
	}
	return reasons;
}

/** `all`, `none`, or a comma-separated list of review names, without repeats. */
export function parseReviews(value: string): Review[] {
	if (value === 'all') return [...REVIEWS];
	if (value === 'none') return [];
	const names = value.split(',').map((name) => name.trim());
	for (const name of names) {
		if (!REVIEWS.includes(name as Review))
			throw new Error(`Unknown review "${name}"; use all, none or ${REVIEWS.join(', ')}.`);
	}
	return REVIEWS.filter((name) => names.includes(name));
}

export function isFull(reviews: Review[]): boolean {
	return REVIEWS.every((name) => reviews.includes(name));
}

/** The identity of a change: each path and its working-tree bytes, so committing the same bytes keeps it. */
export function changeId(entries: { path: string; content: Buffer | null }[]): string {
	const hash = createHash('sha256');
	for (const entry of [...entries].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))) {
		hash.update(`${entry.path}\0${entry.content === null ? '0' : '1'}`);
		if (entry.content !== null) hash.update(entry.content);
		hash.update('\0');
	}
	return hash.digest('hex');
}

/** Line count of a file, a last line without a newline included. */
export function countLines(content: Buffer): number {
	if (content.length === 0) return 0;
	let lines = 0;
	for (const byte of content) if (byte === 10) lines++;
	return content[content.length - 1] === 10 ? lines : lines + 1;
}

/** The stamp file for a branch. A name that would leave the gate directory is refused. */
export function gateFile(commonDir: string, branch: string): string {
	const root = path.resolve(commonDir, 'gate');
	const file = path.resolve(root, branch);
	if (!branch || branch.split(/[\\/]/).includes('..') || !file.startsWith(root + path.sep)) {
		throw new Error(`Refusing branch name ${branch}`);
	}
	return file;
}

export function parseStamp(text: string): Stamp | undefined {
	const fields = new Map<string, string>();
	for (const line of text.split('\n')) {
		const split = line.indexOf('=');
		if (split > 0) fields.set(line.slice(0, split), line.slice(split + 1));
	}
	const id = fields.get('id');
	const verdict = fields.get('verdict');
	const reviews = fields.get('reviews');
	if (!id || !VERDICTS.includes(verdict as Verdict) || reviews === undefined) return undefined;
	let parsed: Review[];
	try {
		parsed = parseReviews(reviews);
	} catch {
		return undefined;
	}
	const reason = fields.get('reason');
	return { id, verdict: verdict as Verdict, reviews: parsed, ...(reason ? { reason } : {}) };
}

export function formatStamp(stamp: Stamp): string {
	const reviews = isFull(stamp.reviews) ? 'all' : stamp.reviews.length === 0 ? 'none' : stamp.reviews.join(',');
	const reason = stamp.reason ? `reason=${stamp.reason}\n` : '';
	return `id=${stamp.id}\nverdict=${stamp.verdict}\nreviews=${reviews}\n${reason}`;
}

/** A stamp answers a run on the same change, except that one that skipped a review never answers a run of every review. */
export function reusable(stamp: Stamp | undefined, id: string, all = false): stamp is Stamp {
	return stamp !== undefined && stamp.id === id && (!all || isFull(stamp.reviews));
}

function git(cwd: string, args: string[]): string {
	return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/** The working tree against the merge base, plus untracked files, and the identity of those bytes. */
export function collect(cwd: string, base: string): { files: DiffFile[]; id: string } {
	const mergeBase = git(cwd, ['merge-base', base, 'HEAD']).trim();
	const diff = (format: string) => git(cwd, ['diff', '-z', format, '--find-renames', mergeBase, '--', '.']);
	const files = withCounts(parseNameStatus(diff('--name-status')), parseNumstat(diff('--numstat')));
	for (const file of git(cwd, ['ls-files', '-z', '--others', '--exclude-standard', '--', '.'])
		.split('\0')
		.filter(Boolean)) {
		const content = readFileSync(path.join(cwd, file));
		const binary = content.includes(0);
		files.push({ status: 'A', path: file, additions: binary ? 0 : countLines(content), deletions: 0, binary });
	}
	const paths = new Set(files.flatMap((file) => (file.oldPath ? [file.path, file.oldPath] : [file.path])));
	const entries = [...paths].map((file) => {
		const absolute = path.join(cwd, file);
		return { path: file, content: existsSync(absolute) ? readFileSync(absolute) : null };
	});
	return { files, id: changeId(entries) };
}

const USAGE =
	'Usage: gate.mts facts --base <ref>\n       gate.mts read --base <ref> [--all]\n       gate.mts write --base <ref> --verdict "<ready to ship|not ready>" --reviews <all|none|list> [--reason "<one line>"]';

export type Result = { code: number; stdout: string; stderr: string };

/** Runs one command against the repository at `cwd`; the command line below only prints its result. */
export function run(args: string[], cwd: string): Result {
	const out: string[] = [];
	const done = (code: number, stderr = ''): Result => ({
		code,
		stdout: out.map((line) => `${line}\n`).join(''),
		stderr,
	});
	try {
		const { values, positionals } = parseArgs({
			args: args.filter((arg) => arg !== '--'),
			options: {
				base: { type: 'string' },
				all: { type: 'boolean', default: false },
				verdict: { type: 'string' },
				reviews: { type: 'string' },
				reason: { type: 'string' },
			},
			allowPositionals: true,
		});
		const [command] = positionals;
		if (!values.base || !['facts', 'read', 'write'].includes(command)) throw new Error(USAGE);
		const { files, id } = collect(cwd, values.base);

		if (command === 'facts') {
			const why = blockers(files);
			out.push(
				`files: ${files.length} of at most ${MAX_FILES}`,
				`lines: ${changedLines(files)} of at most ${MAX_LINES}`,
			);
			out.push(`small: ${why.length === 0 ? 'yes' : 'no'}`, ...why.map((reason) => `- ${reason}`));
			return done(0);
		}

		const branch = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
		const file = gateFile(path.resolve(cwd, git(cwd, ['rev-parse', '--git-common-dir']).trim()), branch);
		if (command === 'read') {
			const stamp = existsSync(file) ? parseStamp(readFileSync(file, 'utf8')) : undefined;
			const sameChange = stamp?.id === id;
			if (!reusable(stamp, id, values.all)) {
				return done(1, sameChange ? 'stamped with a review skipped; run all of them\n' : 'unstamped\n');
			}
			out.push(stamp.verdict, isFull(stamp.reviews) ? 'all' : stamp.reviews.join(',') || 'none');
			if (stamp.reason) out.push(stamp.reason);
			return done(0);
		}

		if (values.reviews === undefined || !VERDICTS.includes(values.verdict as Verdict)) throw new Error(USAGE);
		const reviews = parseReviews(values.reviews);
		const reason = values.reason?.trim();
		if (reason?.includes('\n')) throw new Error('--reason is one line.');
		if (!isFull(reviews) && !reason) {
			throw new Error('Skipping a review needs --reason: why this change does not need it.');
		}
		mkdirSync(path.dirname(file), { recursive: true });
		writeFileSync(
			file,
			formatStamp({ id, verdict: values.verdict as Verdict, reviews, ...(reason ? { reason } : {}) }),
		);
		return done(0);
	} catch (error) {
		return done(1, `[error] ${error instanceof Error ? error.message : error}\n`);
	}
}

const isMain = process.argv[1] !== undefined && realpathSync(process.argv[1]) === import.meta.filename;

if (isMain) {
	const result = run(process.argv.slice(2), process.env.INIT_CWD ?? process.cwd());
	process.stdout.write(result.stdout);
	process.stderr.write(result.stderr);
	process.exitCode = result.code;
}
