import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { family } from './run-review.mts';

const SCRIPT = path.join(import.meta.dirname, 'run-review.mts');

let root: string;
let repo: string;
let bin: string;
let log: string;
let notes: string;

/**
 * Runs the CLI in a scratch repository with fake `claude`, `cursor-agent`, `codex` and `opencode` first on `PATH` that log
 * their arguments.
 * The developer's own `APLUS_SECOND_OPINION_*` variables are dropped so only the scratch `.env` counts.
 */
function run(...args: string[]) {
	const env = Object.fromEntries(
		Object.entries(process.env).filter(([key]) => !key.startsWith('APLUS_SECOND_OPINION_')),
	);
	return spawnSync(
		process.execPath,
		['--experimental-strip-types', SCRIPT, '--base', 'main', '--notes', notes, ...args],
		{
			cwd: repo,
			encoding: 'utf8',
			env: { ...env, PATH: `${bin}${path.delimiter}${process.env.PATH}` },
		},
	);
}

beforeAll(() => {
	root = mkdtempSync(path.join(os.tmpdir(), 'run-review-'));
	repo = path.join(root, 'repo');
	bin = path.join(root, 'bin');
	log = path.join(root, 'argv.json');
	notes = path.join(root, 'notes.md');
	writeFileSync(notes, 'Own review: fixed a missing null check; left the rename as a nit.\n');
	mkdirSync(repo);
	mkdirSync(bin);
	for (const command of ['claude', 'cursor-agent', 'codex', 'opencode']) {
		writeFileSync(
			path.join(bin, command),
			`#!/usr/bin/env node\nrequire('node:fs').writeFileSync(${JSON.stringify(log)}, JSON.stringify({ argv: process.argv.slice(2), key: process.env.CURSOR_API_KEY }));\n`,
		);
		chmodSync(path.join(bin, command), 0o755);
	}

	const git = (...args: string[]) =>
		execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: repo });
	git('init', '-q', '-b', 'main');
	writeFileSync(path.join(repo, 'a.ts'), 'export const a = 1;\n');
	git('add', '.');
	git('commit', '-q', '-m', 'base');
	git('switch', '-q', '-c', 'feature');
	writeFileSync(path.join(repo, 'a.ts'), 'export const a = 2;\n');
	git('commit', '-q', '-am', 'committed change');
	writeFileSync(path.join(repo, 'a.ts'), 'export const a = 3;\n');
	writeFileSync(path.join(repo, 'b.ts'), 'export const b = 1;\n');
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

beforeEach(() => {
	rmSync(log, { force: true });
	rmSync(path.join(repo, '.env'), { force: true });
});

function harnessCall(): { argv: string[]; key?: string } {
	return JSON.parse(readFileSync(log, 'utf8'));
}

test('reads the family from a model id or alias, past any provider prefix', () => {
	expect(['opus', 'sonnet', 'claude-opus-5-5', 'claude-4.5-sonnet', 'fable'].map(family)).toEqual(
		Array(5).fill('claude'),
	);
	expect(['gpt-6.1-sol', 'github-copilot/gpt-6.1-sol', 'o3', 'codex-mini'].map(family)).toEqual(Array(4).fill('gpt'));
	expect(['grok-4.7-high', 'opencode-go/grok-4.7', 'kimi-k3', 'composer-2.5'].map(family)).toEqual([
		'grok',
		'grok',
		'kimi',
		'composer',
	]);
});

test('refuses a fourth round without calling a harness', () => {
	const result = run('--self', 'opus', '--round', '4');

	expect(result.status).not.toBe(0);
	expect(result.stderr).toContain('at most three rounds');
	expect(existsSync(log)).toBe(false);
});

test('needs --self unless --harness and --model are passed together', () => {
	expect(run().stderr).toContain('--self needs the model you run on');
	expect(run('--model', 'sonnet').stderr).toContain('Pass --harness and --model together');
	expect(existsSync(log)).toBe(false);
});

test('writes the prompt to a file and exits 2 when no reviewer is from another family', () => {
	writeFileSync(path.join(repo, '.env'), 'APLUS_SECOND_OPINION_REVIEWERS=cursor:claude-4.5-sonnet,claude:sonnet\n');
	const result = run('--self', 'claude-opus-5-5');

	expect(result.status).toBe(2);
	expect(result.stderr).toContain('No reviewer from a family other than claude');
	const file = /The review prompt is in (\S+):/.exec(result.stderr)?.[1] ?? '';
	expect(readFileSync(file, 'utf8')).toContain('# Review from a second model');
	expect(existsSync(log)).toBe(false);
});

test('fails, rather than skipping, when any listed entry is not supported', () => {
	writeFileSync(path.join(repo, '.env'), 'APLUS_SECOND_OPINION_REVIEWERS=cursor:grok-4,Claude:opus\n');
	const result = run('--self', 'gpt-6.1-sol');

	expect(result.status).toBe(1);
	expect(result.stderr).toContain('"Claude" is not supported');
	expect(existsSync(log)).toBe(false);
});

test('refuses a fast model variant without calling a harness', () => {
	writeFileSync(path.join(repo, '.env'), 'APLUS_SECOND_OPINION_REVIEWERS=cursor:grok-4.7-high-fast\n');
	const result = run('--self', 'opus');

	expect(result.status).not.toBe(0);
	expect(result.stderr).toContain('a fast variant');
	expect(existsSync(log)).toBe(false);
});

test('sends the brief, the round, the notes, every change since the merge base and the untracked files to the first reviewer from another family, with its harness key under the variable the harness reads', () => {
	writeFileSync(
		path.join(repo, '.env'),
		'APLUS_SECOND_OPINION_REVIEWERS=cursor:claude-4.5-sonnet,cursor:grok-4\nAPLUS_SECOND_OPINION_CURSOR_API_KEY=review-key\nAPLUS_SECOND_OPINION_CODEX_API_KEY=other-key\n',
	);
	const result = run('--self', 'claude-opus-5-5');

	expect(result.stderr).toBe('');
	expect(result.status).toBe(0);
	const { argv, key } = harnessCall();
	expect(key).toBe('review-key');
	expect(argv).toEqual(expect.arrayContaining(['-p', '--trust', '--mode', 'ask', '--model', 'grok-4']));
	const prompt = argv[argv.length - 1];
	expect(prompt).toContain('# Review from a second model');
	expect(prompt).toContain('Round 1 of at most 3.');
	expect(prompt).toContain('fixed a missing null check');
	expect(prompt).toContain('-export const a = 1;\n+export const a = 3;');
	expect(prompt).toContain('- b.ts');
});

test('reviews on the harness and model passed as flags, ignoring the list', () => {
	writeFileSync(path.join(repo, '.env'), 'APLUS_SECOND_OPINION_REVIEWERS=codex:gpt-6.1-sol\n');
	const result = run('--harness', 'cursor', '--model', 'gpt-5.6-sol-high');

	expect(result.status).toBe(0);
	expect(harnessCall().argv).toEqual(expect.arrayContaining(['--model', 'gpt-5.6-sol-high']));
});

test.for(['2', '3'])('accepts round %s and names it in the prompt', (round) => {
	const result = run('--harness', 'cursor', '--model', 'grok-4', '--round', round);

	expect(result.status).toBe(0);
	const { argv } = harnessCall();
	expect(argv[argv.length - 1]).toContain(`Round ${round} of at most 3.`);
});

test("passes an @effort suffix as each harness's own option, and refuses it for Cursor", () => {
	expect(run('--harness', 'codex', '--model', 'gpt-6.1-sol@low').status).toBe(0);
	expect(harnessCall().argv).toEqual(
		expect.arrayContaining(['--model', 'gpt-6.1-sol', '-c', 'model_reasoning_effort=low']),
	);

	expect(run('--harness', 'claude', '--model', 'sonnet@medium').status).toBe(0);
	expect(harnessCall().argv).toEqual(expect.arrayContaining(['--model', 'sonnet', '--effort', 'medium']));

	expect(run('--harness', 'opencode', '--model', 'opencode-go/kimi-k3@high').status).toBe(0);
	expect(harnessCall().argv).toEqual(expect.arrayContaining(['--model', 'opencode-go/kimi-k3', '--variant', 'high']));

	rmSync(log);
	expect(run('--harness', 'cursor', '--model', 'grok-4@low').stderr).toContain(
		'Cursor names the effort in the model id',
	);
	expect(existsSync(log)).toBe(false);
});

test("allows Cursor's fast=false override, commas inside its brackets included", () => {
	writeFileSync(
		path.join(repo, '.env'),
		'APLUS_SECOND_OPINION_REVIEWERS=cursor:claude-opus-4-8[effort=high,fast=false],codex:gpt-6.1-sol\n',
	);
	const result = run('--self', 'grok-4.7-high');

	expect(result.status).toBe(0);
	expect(harnessCall().argv).toEqual(expect.arrayContaining(['--model', 'claude-opus-4-8[effort=high,fast=false]']));
});
