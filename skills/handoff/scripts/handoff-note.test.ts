import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { handoffDir, projectName } from './handoff-note.mts';

const SCRIPT = path.join(import.meta.dirname, 'handoff-note.mts');

test('handoffDir uses the first APLUS_AUDIT_DIRS entry, defaults to .audit, and resolves {project}', () => {
	expect(handoffDir(undefined, '/r', 'p')).toBe('/r/.audit/handoffs');
	expect(handoffDir(' , ', '/r', 'p')).toBe('/r/.audit/handoffs');
	expect(handoffDir('notes, /v/{project}', '/r', 'p')).toBe('/r/notes/handoffs');
	expect(handoffDir('/v/{project}/audit', '/r', 'p')).toBe('/v/p/audit/handoffs');
});

/** A repository with one commit and a linked worktree on `fix/thing`, removed after `body`. */
function withRepo(body: (dirs: { root: string; repo: string; linked: string }) => void): void {
	const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'handoff-')));
	const repo = path.join(root, 'repo');
	const linked = path.join(root, 'linked');
	try {
		execFileSync('git', ['init', '-q', '-b', 'main', repo]);
		const sh = (...args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
		sh('-c', 'user.email=a@b.c', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'init');
		sh('worktree', 'add', '-q', '-b', 'fix/thing', linked);
		body({ root, repo, linked });
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

function run(cwd: string, ...args: string[]) {
	const env: NodeJS.ProcessEnv = { ...process.env, INIT_CWD: cwd };
	delete env.APLUS_AUDIT_DIRS;
	return spawnSync('node', ['--experimental-strip-types', SCRIPT, ...args], { cwd, env, encoding: 'utf8' });
}

test('projectName takes the origin URL, else the folder name', () => {
	withRepo(({ repo }) => {
		expect(projectName(repo)).toBe('repo');
		execFileSync('git', ['remote', 'add', 'origin', 'git@host:o/name.git'], { cwd: repo });
		expect(projectName(repo)).toBe('name');
	});
});

test('a worktree shares the primary checkout note, and an unignored dir stops the script', () => {
	withRepo(({ repo, linked }) => {
		const blocked = run(linked);
		expect(blocked.status).toBe(1);
		expect(blocked.stderr).toContain('.audit/handoffs/ is not gitignored');

		writeFileSync(path.join(repo, '.gitignore'), '.audit/\n');
		const note = path.join(repo, '.audit/handoffs/fix/thing.md');
		expect(run(linked).stdout).toBe(`${note}\n`);
		const empty = run(repo, '--list');
		expect(empty.status).toBe(1);
		expect(empty.stderr).toContain('No handoff note in');

		writeFileSync(note, 'paused\n');
		expect(run(repo, '--list').stdout).toBe(`fix/thing\t${note}\n`);
	});
});

test('--branch names another branch, and a detached HEAD or an invalid name stops the script', () => {
	withRepo(({ repo }) => {
		writeFileSync(path.join(repo, '.gitignore'), '.audit/\n');
		const note = path.join(repo, '.audit/handoffs/feat/a/b.md');
		expect(run(repo, '--branch', 'feat/a/b').stdout).toBe(`${note}\n`);
		expect(existsSync(path.dirname(note))).toBe(true);
		expect(run(repo, '--branch', '../../x').stderr).toContain('not a valid branch name');

		execFileSync('git', ['checkout', '-q', '--detach'], { cwd: repo });
		expect(run(repo).stderr).toContain('HEAD is detached');
	});
});

test('the primary checkout .env sets the dir, and a dir outside the repository needs no ignore rule', () => {
	withRepo(({ root, repo, linked }) => {
		const vault = path.join(root, 'vault');
		mkdirSync(vault);
		writeFileSync(path.join(repo, '.env'), `APLUS_AUDIT_DIRS=${vault}/{project}\n`);
		expect(run(linked).stdout).toBe(`${path.join(vault, 'repo/handoffs/fix/thing.md')}\n`);
	});
});
