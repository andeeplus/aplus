import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { fill, pickDate } from './new-audit.mts';

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

test('starts an audit, adds a review, and stops when .audit/ is not ignored', () => {
	const repo = mkdtempSync(path.join(os.tmpdir(), 'new-audit-'));
	try {
		execFileSync('git', ['init', '-q'], { cwd: repo });
		const run = (...args: string[]) =>
			spawnSync(process.execPath, ['--experimental-strip-types', SCRIPT, ...args], {
				cwd: repo,
				env: { ...process.env, INIT_CWD: repo },
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
