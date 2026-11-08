import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { handoffDir } from './handoff-note.mts';

const SCRIPT = path.join(import.meta.dirname, 'handoff-note.mts');

test('handoffDir uses the first APLUS_AUDIT_DIRS entry, defaults to .audit, and resolves {project}', () => {
	expect(handoffDir(undefined, '/r', 'p')).toBe('/r/.audit/handoffs');
	expect(handoffDir(' , ', '/r', 'p')).toBe('/r/.audit/handoffs');
	expect(handoffDir('notes, /v/{project}', '/r', 'p')).toBe('/r/notes/handoffs');
	expect(handoffDir('/v/{project}/audit', '/r', 'p')).toBe('/v/p/audit/handoffs');
});

test('a worktree shares the primary checkout note, and an unignored dir stops the script', () => {
	const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'handoff-')));
	const repo = path.join(root, 'repo');
	const linked = path.join(root, 'linked');
	const env = { ...process.env, APLUS_AUDIT_DIRS: '' };
	const run = (cwd: string, ...args: string[]) =>
		spawnSync('node', ['--experimental-strip-types', SCRIPT, ...args], {
			cwd,
			env: { ...env, INIT_CWD: cwd },
			encoding: 'utf8',
		});
	try {
		const sh = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' });
		execFileSync('git', ['init', '-q', '-b', 'main', repo]);
		sh(repo, '-c', 'user.email=a@b.c', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'init');
		sh(repo, 'worktree', 'add', '-q', '-b', 'fix/thing', linked);

		const blocked = run(linked);
		expect(blocked.status).toBe(1);
		expect(blocked.stderr).toContain('.audit/handoffs/ is not gitignored');

		writeFileSync(path.join(repo, '.gitignore'), '.audit/\n');
		const note = path.join(repo, '.audit/handoffs/fix/thing.md');
		expect(run(linked).stdout).toBe(`${note}\n`);
		expect(run(repo, '--list').status).toBe(1);

		writeFileSync(note, 'paused\n');
		expect(run(repo, '--list').stdout).toBe(`fix/thing\t${note}\n`);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
