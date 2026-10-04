import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { problem, stackedOn, type PullRequest } from './merge-stack.mts';

const pr = (id: number, source: string, destination: string, state = 'OPEN'): PullRequest => ({
	id,
	title: `PR ${id}`,
	state,
	source: { branch: { name: source } },
	destination: { branch: { name: destination } },
});

test("stackedOn finds the open PRs aimed at the merging PR's source branch", () => {
	const stack = [pr(1, 'a', 'main'), pr(2, 'b', 'a'), pr(3, 'c', 'b'), pr(4, 'd', 'main')];
	expect(stackedOn(stack[0], stack).map((item) => item.id)).toEqual([2]);
});

test('problem refuses a PR that is not open', () => {
	expect(problem(pr(1, 'a', 'main'))).toBeUndefined();
	expect(problem(pr(1, 'a', 'main', 'MERGED'))).toBe('#1 is MERGED, not OPEN');
});

/**
 * @remarks
 * Runs the CLI with a fake `atlassian-cli` first on `PATH` that keeps pull requests in a file and logs each
 * call. `ignoreRetarget` makes the fake accept a PUT without changing anything, as Bitbucket can.
 */
function setup(ignoreRetarget: boolean) {
	const work = mkdtempSync(path.join(os.tmpdir(), 'merge-stack-'));
	const bin = path.join(work, 'bin');
	const state = path.join(work, 'prs.json');
	const log = path.join(work, 'calls.log');
	mkdirSync(bin);
	writeFileSync(state, JSON.stringify([pr(1, 'a', 'main'), pr(2, 'b', 'a'), pr(3, 'c', 'b')]));
	writeFileSync(
		path.join(bin, 'atlassian-cli'),
		`#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(5);
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(args) + '\\n');
const prs = JSON.parse(fs.readFileSync(${JSON.stringify(state)}, 'utf8'));
const save = () => fs.writeFileSync(${JSON.stringify(state)}, JSON.stringify(prs));
if (args[0] === 'api') {
	const endpoint = args[1];
	const id = Number(/pullrequests\\/(\\d+)/.exec(endpoint)?.[1]);
	if (args.includes('put')) {
		if (!${ignoreRetarget}) prs.find((p) => p.id === id).destination.branch.name = JSON.parse(args[args.indexOf('-d') + 1]).destination.branch.name;
		save();
		console.log('{}');
	} else if (id) console.log(JSON.stringify(prs.find((p) => p.id === id)));
	else console.log(JSON.stringify({ values: prs.filter((p) => p.state === 'OPEN') }));
} else if (args[0] === 'pr' && args[1] === 'merge') {
	prs.find((p) => p.id === Number(args[3])).state = 'MERGED';
	save();
}
`,
	);
	chmodSync(path.join(bin, 'atlassian-cli'), 0o755);
	const run = (...args: string[]) =>
		spawnSync(
			process.execPath,
			['--experimental-strip-types', path.join(import.meta.dirname, 'merge-stack.mts'), 'repo', ...args],
			{ env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` }, encoding: 'utf8' },
		);
	const prsNow = () => JSON.parse(readFileSync(state, 'utf8')) as PullRequest[];
	const writes = () =>
		readFileSync(log, 'utf8')
			.trim()
			.split('\n')
			.map((line) => JSON.parse(line) as string[])
			.filter((args) => args.includes('put') || args[1] === 'merge');
	return { run, prsNow, writes, done: () => rmSync(work, { recursive: true, force: true }) };
}

test('merges the bottom PR after retargeting the one stacked on it, and changes nothing on a dry run', () => {
	const { run, prsNow, writes, done } = setup(false);
	try {
		const dry = run('1', '--strategy', 'squash');
		expect(dry.stdout).toMatch(/retarget #2 PR 2: a -> main/);
		expect(writes()).toEqual([]);

		expect(run('1', '--strategy', 'squash', '--apply').status).toBe(0);
		expect(prsNow().map((item) => [item.id, item.state, item.destination.branch.name])).toEqual([
			[1, 'MERGED', 'main'],
			[2, 'OPEN', 'main'],
			[3, 'OPEN', 'b'],
		]);
		expect(writes().map((args) => (args.includes('put') ? 'retarget' : 'merge'))).toEqual(['retarget', 'merge']);

		expect(run('1', '--strategy', 'squash').stderr).toMatch(/#1 is MERGED/);
	} finally {
		done();
	}
});

test('does not merge when Bitbucket accepts the retarget but does not apply it', () => {
	const { run, prsNow, writes, done } = setup(true);
	try {
		const result = run('1', '--strategy', 'merge_commit', '--apply');
		expect(result.status).toBe(1);
		expect(result.stderr).toMatch(/#2 still targets a, not main. Nothing was merged./);
		expect(prsNow()[0].state).toBe('OPEN');
		expect(writes().some((args) => args[1] === 'merge')).toBe(false);
	} finally {
		done();
	}
});
