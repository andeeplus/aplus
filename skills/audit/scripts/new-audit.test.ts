import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { auditDirs, fill, pickDate, projectName } from './new-audit.mts';

const SCRIPT = path.join(import.meta.dirname, 'new-audit.mts');

test('pickDate keeps a program in the folder of its first day', () => {
	expect(pickDate([], '2026-10-04', false)).toBe('2026-10-04');
	expect(pickDate(['2026-10-01', '2026-09-30', 'x'], '2026-10-04', true)).toBe('2026-09-30');
	expect(() => pickDate([], '2026-10-04', true)).toThrow(/Start it without --review/);
	expect(() => pickDate(['2026-10-01'], '2026-10-04', false)).toThrow(/--review/);
});

test('fill replaces spaced and unspaced placeholders and leaves the rest', () => {
	expect(fill('a: { x }, b: {x}, c: {y}', { x: '1' })).toBe('a: 1, b: 1, c: {y}');
});

test('auditDirs defaults to .audit, resolves {project} and keeps the order', () => {
	expect(auditDirs(undefined, '/r', 'p')).toEqual(['/r/.audit']);
	expect(auditDirs(' , ', '/r', 'p')).toEqual(['/r/.audit']);
	expect(auditDirs('.audit, /v/{project}/a', '/r', 'p')).toEqual(['/r/.audit', '/v/p/a']);
});

test('projectName takes the origin repository, else the folder, and is folder-safe', () => {
	const repo = mkdtempSync(path.join(os.tmpdir(), 'my repo-'));
	try {
		execFileSync('git', ['init', '-q'], { cwd: repo });
		expect(projectName(repo)).toBe(path.basename(repo).replace(/ /g, '-'));
		execFileSync('git', ['remote', 'add', 'origin', 'git@github.com:org/aplus.git'], { cwd: repo });
		expect(projectName(repo)).toBe('aplus');
	} finally {
		rmSync(repo, { recursive: true, force: true });
	}
});

test('mirrors get a copy per project and survive deleting the working copy', () => {
	const repo = mkdtempSync(path.join(os.tmpdir(), 'new-audit-'));
	const vault = mkdtempSync(path.join(os.tmpdir(), 'vault-'));
	try {
		execFileSync('git', ['init', '-q'], { cwd: repo });
		writeFileSync(path.join(repo, '.gitignore'), '.audit/\n');
		const run = (...args: string[]) =>
			spawnSync(process.execPath, ['--experimental-strip-types', SCRIPT, ...args], {
				cwd: repo,
				env: {
					...process.env,
					INIT_CWD: repo,
					APLUS_AUDIT_DIRS: `.audit,${path.join(vault, '{project}')}`,
				},
				encoding: 'utf8',
			});
		expect(run('router', '--author', 'a', '--model', 'm').status).toBe(0);
		const mirror = path.join(vault, path.basename(repo), 'router');
		const [date] = readdirSync(mirror);
		writeFileSync(path.join(repo, '.audit/router', date, 'bugs.md'), '# Bugs\n\n## B1: x\n');
		expect(run('--sync').status).toBe(0);
		expect(readFileSync(path.join(mirror, date, 'bugs.md'), 'utf8')).toMatch(/B1/);
		rmSync(path.join(repo, '.audit'), { recursive: true });
		expect(existsSync(path.join(mirror, date, 'README.md'))).toBe(true);
		expect(run('--sync').stderr).toMatch(/No audit in/);
	} finally {
		rmSync(repo, { recursive: true, force: true });
		rmSync(vault, { recursive: true, force: true });
	}
});

test('starts an audit, adds a review, and stops when .audit/ is not ignored', () => {
	const repo = mkdtempSync(path.join(os.tmpdir(), 'new-audit-'));
	try {
		execFileSync('git', ['init', '-q'], { cwd: repo });
		const run = (...args: string[]) =>
			spawnSync(process.execPath, ['--experimental-strip-types', SCRIPT, ...args], {
				cwd: repo,
				env: { ...process.env, INIT_CWD: repo, APLUS_AUDIT_DIRS: '' },
				encoding: 'utf8',
			});
		const start = ['router', '--author', 'claude-opus', '--model', 'opus'];

		expect(run(...start).stderr).toMatch(/not gitignored/);

		writeFileSync(path.join(repo, '.gitignore'), '.audit/\n');
		expect(run(...start).status).toBe(0);
		const [date] = execFileSync('ls', [path.join(repo, '.audit/router')], { encoding: 'utf8' })
			.trim()
			.split('\n');
		const dir = path.join(repo, '.audit/router', date);
		const readme = readFileSync(path.join(dir, 'README.md'), 'utf8');
		expect(readme).toMatch(/scope: router/);
		expect(readme).toMatch(/posture: strict/);
		expect(readme).toMatch(/# Audit: router/);
		for (const file of ['bugs.md', 'program.md', 'notes.md', 'issues'])
			expect(existsSync(path.join(dir, file))).toBe(true);

		expect(run(...start).stderr).toMatch(/--review/);
		expect(run('router', '--author', 'codex', '--model', 'gpt', '--review').status).toBe(0);
		expect(readFileSync(path.join(dir, 'review-codex.md'), 'utf8')).toMatch(/author: codex/);
		expect(run('docs', '--author', 'a', '--model', 'm', '--posture', 'balanced').status).toBe(0);
		expect(existsSync(path.join(repo, '.audit/docs', date, 'program.md'))).toBe(false);
	} finally {
		rmSync(repo, { recursive: true, force: true });
	}
});
