import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import {
	MAX_FILES,
	MAX_LINES,
	blockers,
	changeId,
	countLines,
	gateFile,
	isFull,
	run as gate,
	parseNameStatus,
	parseNumstat,
	parseReviews,
	parseStamp,
	reusable,
	withCounts,
	type DiffFile,
} from './gate.mts';

const SCRIPT = path.join(import.meta.dirname, 'gate.mts');

function file(overrides: Partial<DiffFile> & Pick<DiffFile, 'path'>): DiffFile {
	return { status: 'M', additions: 1, deletions: 0, binary: false, ...overrides };
}

test('parses a rename and a binary file from git -z output', () => {
	const status = 'A\0bin.dat\0R050\0old.ts\0dir/new.ts\0';
	const numstat = '-\t-\tbin.dat\0' + '1\t0\t\0old.ts\0dir/new.ts\0';
	expect(withCounts(parseNameStatus(status), parseNumstat(numstat))).toEqual([
		{ status: 'A', path: 'bin.dat', additions: 0, deletions: 0, binary: true },
		{ status: 'R050', path: 'dir/new.ts', oldPath: 'old.ts', additions: 1, deletions: 0, binary: false },
	]);
});

test('a change is small only inside the file and line limits', () => {
	expect(blockers([])).toEqual([]);
	expect(blockers([file({ path: 'src/a.ts', additions: MAX_LINES })])).toEqual([]);
	expect(blockers([file({ path: 'src/a.ts', additions: MAX_LINES + 1 })])).toEqual([
		`${MAX_LINES + 1} lines, over ${MAX_LINES}`,
	]);
	const many = Array.from({ length: MAX_FILES + 1 }, (_, index) => file({ path: `src/f${index}.ts`, additions: 0 }));
	expect(blockers(many)).toEqual([`${MAX_FILES + 1} files, over ${MAX_FILES}`]);
});

test('a new test, doc or release note is small; new source, binaries, copies and moves across directories are not', () => {
	const fix = file({ path: 'src/a.ts' });
	expect(
		blockers([
			fix,
			file({ status: 'A', path: 'src/a.test.ts' }),
			file({ status: 'A', path: '.changeset/fix.md' }),
			file({ status: 'R100', path: 'src/b.ts', oldPath: 'src/old.ts', additions: 0 }),
		]),
	).toEqual([]);
	expect(blockers([fix, file({ status: 'A', path: 'src/b.ts' })])).toEqual(['new source file: src/b.ts']);
	expect(blockers([file({ path: 'logo.png', binary: true })])).toEqual(['binary file: logo.png']);
	expect(blockers([file({ status: 'C100', path: 'src/b.ts', oldPath: 'src/a.ts' })])).toEqual([
		'copied file: src/a.ts -> src/b.ts',
	]);
	expect(blockers([file({ status: 'R100', path: 'lib/a.ts', oldPath: 'src/a.ts' })])).toEqual([
		'moved across directories: src/a.ts -> lib/a.ts',
	]);
});

test('reviews parse as all, none or a list in a fixed order, and an unknown name fails', () => {
	expect(parseReviews('all')).toEqual(['tests', 'quality', 'docs', 'second-opinion']);
	expect(parseReviews('none')).toEqual([]);
	expect(parseReviews('docs, tests')).toEqual(['tests', 'docs']);
	expect(() => parseReviews('tests,lint')).toThrow(/Unknown review "lint"/);
	expect(isFull(parseReviews('all'))).toBe(true);
	expect(isFull(parseReviews('tests,quality,docs'))).toBe(false);
});

test('a stamp that skipped a review never answers a run that wants them all', () => {
	const skipped = parseStamp('id=x\nverdict=ready to ship\nreviews=tests\nreason=typo in an error message\n');
	expect(skipped).toEqual({
		id: 'x',
		verdict: 'ready to ship',
		reviews: ['tests'],
		reason: 'typo in an error message',
	});
	expect(reusable(skipped, 'x')).toBe(true);
	expect(reusable(skipped, 'x', true)).toBe(false);
	expect(reusable(skipped, 'y')).toBe(false);
	expect(reusable(parseStamp('id=x\nverdict=ready to ship\nreviews=all\n'), 'x', true)).toBe(true);
	expect(parseStamp('id=x\nverdict=maybe\nreviews=all\n')).toBeUndefined();
	expect(parseStamp('id=x\nverdict=ready to ship\nreviews=lint\n')).toBeUndefined();
});

test('the change id follows the bytes, not the path order', () => {
	const first = { path: 'b.ts', content: Buffer.from('b') };
	const second = { path: 'a.ts', content: Buffer.from('a') };
	expect(changeId([first, second])).toBe(changeId([second, first]));
	expect(changeId([second])).not.toBe(changeId([{ path: 'a.ts', content: null }]));
	expect(countLines(Buffer.from('a\nb\n'))).toBe(2);
	expect(countLines(Buffer.from('a\nb'))).toBe(2);
});

test('the stamp path stays inside the gate directory', () => {
	expect(gateFile('/repo/.git', 'fix/thing')).toBe(path.resolve('/repo/.git/gate/fix/thing'));
	expect(() => gateFile('/repo/.git', '../outside')).toThrow(/Refusing branch name/);
});

test('stamps a verdict with the reviews that ran, keeps it through the commit, and drops it on a further edit', () => {
	const repo = mkdtempSync(path.join(os.tmpdir(), 'gate-'));
	try {
		const sh = (...args: string[]) => execFileSync('git', args, { cwd: repo });
		sh('init', '-q', '-b', 'main');
		sh('config', 'user.email', 'a@b.c');
		sh('config', 'user.name', 't');
		writeFileSync(path.join(repo, 'a.ts'), 'export const a = 1;\n');
		sh('add', 'a.ts');
		sh('commit', '-qm', 'init');
		sh('checkout', '-q', '-b', 'fix/thing');
		const run = (...args: string[]) => {
			const { code, stdout, stderr } = gate(args, repo);
			return { status: code, stdout, stderr };
		};
		const stamp = (...extra: string[]) =>
			run('write', '--base', 'main', '--verdict', 'ready to ship', '--reviews', 'tests', ...extra);

		writeFileSync(path.join(repo, 'a.ts'), 'export const a = 2;\n');
		writeFileSync(path.join(repo, 'note.md'), 'Fix a.\n');
		expect(run('facts', '--base', 'main').stdout).toBe(
			`files: 2 of at most ${MAX_FILES}\nlines: 3 of at most ${MAX_LINES}\nsmall: yes\n`,
		);
		expect(run('read', '--base', 'main').stderr).toContain('unstamped');
		expect(stamp().stderr).toContain('needs --reason');
		expect(stamp('--reason', 'one constant').status).toBe(0);
		expect(run('read', '--base', 'main').stdout).toBe('ready to ship\ntests\none constant\n');
		expect(run('read', '--base', 'main', '--all').stderr).toContain('run all of them');

		sh('add', 'a.ts', 'note.md');
		sh('commit', '-qm', 'fix');
		expect(run('read', '--base', 'main').status).toBe(0);

		writeFileSync(path.join(repo, 'b.ts'), 'export const b = 1;\n');
		expect(run('read', '--base', 'main').status).toBe(1);
		expect(run('facts', '--base', 'main').stdout).toContain('small: no\n- new source file: b.ts\n');
		expect(stamp('--reason', 'agent judged it fine').status).toBe(0);
		expect(run('write', '--base', 'main', '--verdict', 'ready to ship', '--reviews', 'all').status).toBe(0);
		expect(run('read', '--base', 'main', '--all').stdout).toBe('ready to ship\nall\n');
	} finally {
		rmSync(repo, { recursive: true, force: true });
	}
});

test('the command line prints the result and sets the exit code', () => {
	const repo = mkdtempSync(path.join(os.tmpdir(), 'gate-'));
	try {
		const sh = (...args: string[]) => execFileSync('git', args, { cwd: repo });
		sh('init', '-q', '-b', 'main');
		sh('config', 'user.email', 'a@b.c');
		sh('config', 'user.name', 't');
		writeFileSync(path.join(repo, 'a.ts'), 'a\n');
		sh('add', 'a.ts');
		sh('commit', '-qm', 'init');
		const result = spawnSync(process.execPath, ['--experimental-strip-types', SCRIPT, 'read', '--base', 'main'], {
			cwd: repo,
			env: { ...process.env, INIT_CWD: repo },
			encoding: 'utf8',
		});
		expect(result.status).toBe(1);
		expect(result.stderr).toBe('unstamped\n');
	} finally {
		rmSync(repo, { recursive: true, force: true });
	}
});
