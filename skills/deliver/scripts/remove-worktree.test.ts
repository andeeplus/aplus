import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { harnessManaged, removeWorktree, worktreeDecision } from './remove-worktree.mts';

const SCRIPT = path.join(import.meta.dirname, 'remove-worktree.mts');

test('removes a clean linked worktree no harness manages, once its branch is pushed or handed off', () => {
	const safe = { linked: true, managed: false, clean: true, pushed: true, handoff: false };
	expect(worktreeDecision({ ...safe, linked: false })).toBe('primary');
	expect(worktreeDecision({ ...safe, managed: true })).toBe('managed');
	expect(worktreeDecision({ ...safe, clean: false })).toBe('dirty');
	expect(worktreeDecision({ ...safe, pushed: false })).toBe('unpushed');
	expect(worktreeDecision(safe)).toBe('remove');
	expect(worktreeDecision({ ...safe, pushed: false, handoff: true })).toBe('remove');
});

test('a worktree under a harness folder is managed', () => {
	expect(harnessManaged('/Users/me/.cursor/worktrees/aplus/abc')).toBe(true);
	expect(harnessManaged('/repo/.claude/worktrees/fix')).toBe(true);
	expect(harnessManaged('/Users/me/.codex/worktrees/1/aplus')).toBe(true);
	expect(harnessManaged('/Users/me/github/aplus-fix')).toBe(false);
});

test('keeps the primary checkout and a locked worktree, and removes a handed-off one without deleting its branch', () => {
	const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'worktree-')));
	const repo = path.join(root, 'repo');
	const linked = path.join(root, 'linked');
	try {
		const sh = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' });
		execFileSync('git', ['init', '-q', '-b', 'main', repo]);
		sh(repo, 'config', 'user.email', 'a@b.c');
		sh(repo, 'config', 'user.name', 't');
		writeFileSync(path.join(repo, 'a.txt'), 'a\n');
		sh(repo, 'add', 'a.txt');
		sh(repo, 'commit', '-qm', 'init');
		const run = (cwd: string) => ({ stdout: removeWorktree(cwd).join('\n') + '\n' });

		expect(run(repo).stdout).toBe('kept primary\n');

		sh(repo, 'worktree', 'add', '-q', '-b', 'fix/thing', linked);
		writeFileSync(path.join(linked, 'a.txt'), 'b\n');
		expect(run(linked).stdout).toBe('kept dirty\n');

		sh(linked, 'add', 'a.txt');
		sh(linked, 'commit', '-qm', 'edit');
		expect(run(linked).stdout).toBe('kept unpushed\n');

		const note = path.resolve(linked, sh(linked, 'rev-parse', '--git-common-dir').trim(), 'handoff/fix/thing.md');
		mkdirSync(path.dirname(note), { recursive: true });
		writeFileSync(note, 'paused\n');
		sh(repo, 'worktree', 'lock', linked);
		expect(run(linked).stdout).toBe('kept managed\n');

		sh(repo, 'worktree', 'unlock', linked);
		expect(run(linked).stdout).toBe(`removed ${linked}\ncontinue in ${repo}\n`);
		expect(sh(repo, 'rev-parse', '--verify', 'fix/thing')).toMatch(/^[0-9a-f]{40}\n$/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('the command line prints what it did', () => {
	const repo = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'worktree-')));
	try {
		const sh = (...args: string[]) => execFileSync('git', args, { cwd: repo });
		sh('init', '-q', '-b', 'main');
		sh('-c', 'user.email=a@b.c', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'init');
		const result = spawnSync(process.execPath, ['--experimental-strip-types', SCRIPT], {
			cwd: repo,
			env: { ...process.env, INIT_CWD: repo },
			encoding: 'utf8',
		});
		expect(result.stdout).toBe('kept primary\n');
	} finally {
		rmSync(repo, { recursive: true, force: true });
	}
});
