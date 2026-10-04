import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { linkState, orderDrafts, parseDraft, resolveTokens, unsetRequired, validateDrafts } from './create-issues.mts';

const draft = (name: string, front: string, body = 'Text') => parseDraft(`${name}.md`, `---\n${front}\n---\n${body}`);
const types = new Map([['Task', [{ fieldId: 'summary', name: 'Summary', required: true, hasDefaultValue: false }]]]);

describe('parseDraft', () => {
	it('reads the type, lists and the key from the file name', () => {
		const parsed = draft(
			'T2',
			'template: Task\ntitle: Move the cache\nlabels: [a, "b"]\nparent: T1\nblockedBy: [T3]',
		);
		expect(parsed).toMatchObject({
			key: 'T2',
			template: 'Task',
			labels: ['a', 'b'],
			parent: 'T1',
			blockedBy: ['T3'],
		});
	});
});

describe('unsetRequired', () => {
	it('names required fields nothing provides', () => {
		const fields = [
			{ fieldId: 'summary', name: 'Summary', required: true, hasDefaultValue: false },
			{ fieldId: 'customfield_1', name: 'Team', required: true, hasDefaultValue: false },
			{ fieldId: 'priority', name: 'Priority', required: true, hasDefaultValue: true },
		];
		expect(unsetRequired(fields)).toEqual(['Team']);
	});
});

describe('validateDrafts', () => {
	it('rejects an unknown issue type, a missing title and an unknown reference', () => {
		const errors = validateDrafts([draft('A', 'template: Epic\ntitle:', 'See #{ZZ}')], types, new Set());
		expect(errors.join('\n')).toMatch(/title is required/);
		expect(errors.join('\n')).toMatch(/template must be one of Task/);
		expect(errors.join('\n')).toMatch(/unknown key ZZ/);
	});
	it('accepts a valid set and rejects a cycle', () => {
		const good = [draft('A', 'template: Task\ntitle: A'), draft('B', 'template: Task\ntitle: B\nblockedBy: [A]')];
		expect(validateDrafts(good, types, new Set())).toEqual([]);
		const cycle = [
			draft('A', 'template: Task\ntitle: A\nblockedBy: [B]'),
			draft('B', 'template: Task\ntitle: B\nblockedBy: [A]'),
		];
		expect(validateDrafts(cycle, types, new Set()).join()).toMatch(/cycle/);
	});
});

describe('orderDrafts and resolveTokens', () => {
	it('puts the blocker first and fills in created keys', () => {
		const ordered = orderDrafts([
			draft('B', 'template: Task\ntitle: B\nblockedBy: [A]'),
			draft('A', 'template: Task\ntitle: A'),
		]);
		expect(ordered.map((item) => item.key)).toEqual(['A', 'B']);
		expect(resolveTokens('after #{A}, #{B}', { A: { jira: 'P-1' } })).toBe('after P-1, #{B}');
	});
});

describe('linkState', () => {
	const links = (side: 'inwardIssue' | 'outwardIssue') => [
		{ id: '9', type: { name: 'Blocks' }, [side]: { key: 'P-1' } },
	];
	it('reads the blocker as inwardIssue when the link is right', () => {
		expect(linkState(links('inwardIssue'), 'P-1')).toEqual({ state: 'right', id: '9' });
	});
	it('detects an inverted and a missing link', () => {
		expect(linkState(links('outwardIssue'), 'P-1')).toEqual({ state: 'inverted', id: '9' });
		expect(linkState([], 'P-1')).toEqual({ state: 'missing' });
	});
});

/**
 * @remarks
 * Runs the CLI with a fake `atlassian-cli` first on `PATH` that logs each call and answers like Jira. Its
 * first "links create" comes out inverted, so the test also covers the read-back and the fix.
 */
it('--apply creates issues in order, fixes an inverted link, and a second run changes nothing', () => {
	const work = mkdtempSync(path.join(os.tmpdir(), 'jira-issues-'));
	try {
		const bin = path.join(work, 'bin');
		const log = path.join(work, 'calls.log');
		const state = path.join(work, 'links.json');
		const drafts = path.join(work, 'drafts');
		mkdirSync(bin);
		mkdirSync(drafts);
		writeFileSync(state, '{"next":1,"links":[]}');
		writeFileSync(
			path.join(bin, 'atlassian-cli'),
			`#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2).filter((arg, i, all) => !(arg === '-f' || all[i - 1] === '-f'));
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(args) + '\\n');
const state = JSON.parse(fs.readFileSync(${JSON.stringify(state)}, 'utf8'));
const save = () => fs.writeFileSync(${JSON.stringify(state)}, JSON.stringify(state));
const [, group, sub] = args;
if (group === 'api' && args[2].endsWith('/issuetypes')) console.log(JSON.stringify({ issueTypes: [{ id: '1', name: 'Task' }] }));
else if (group === 'api' && args[2].endsWith('/issuetypes/1')) console.log(JSON.stringify({ fields: [{ fieldId: 'summary', name: 'Summary', required: true, hasDefaultValue: false }] }));
else if (group === 'api') {
	const key = /issue\\/([A-Z]+-\\d+)/.exec(args[2])[1];
	console.log(JSON.stringify({ fields: { issuelinks: state.links.filter((link) => link.on === key).map(({ id, type, inwardIssue, outwardIssue }) => ({ id, type, inwardIssue, outwardIssue })) } }));
} else if (sub === 'create' && args[2] === 'create') { console.log('Created issue: ABC-' + state.next++); save(); }
else if (args[2] === 'links' && args[3] === 'create') {
	// "links create FROM TO" makes FROM blocked by TO: the first call is the inverted one.
	const [from, to] = [args[4], args[5]];
	state.links.push({ id: String(state.next++), on: from, type: { name: 'Blocks' }, inwardIssue: { key: to } });
	state.links.push({ id: String(state.next++), on: to, type: { name: 'Blocks' }, outwardIssue: { key: from } });
	save();
} else if (args[2] === 'links' && args[3] === 'delete') {
	const gone = state.links.find((link) => link.id === args[4]);
	state.links = state.links.filter((link) => link.on !== gone.on && !(link.inwardIssue?.key === gone.on || link.outwardIssue?.key === gone.on) || link.type.name !== 'Blocks');
	save();
}
`,
		);
		chmodSync(path.join(bin, 'atlassian-cli'), 0o755);
		writeFileSync(path.join(drafts, 'T1.md'), '---\ntemplate: Task\ntitle: First\nlabels: [core]\n---\nsee #{T2}');
		writeFileSync(path.join(drafts, 'T2.md'), '---\ntemplate: Task\ntitle: Second\nblockedBy: [T1]\n---\nBody');

		const run = () =>
			execFileSync(
				process.execPath,
				[
					'--experimental-strip-types',
					path.join(import.meta.dirname, 'create-issues.mts'),
					drafts,
					'--project',
					'ABC',
					'--apply',
				],
				{
					env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, INIT_CWD: work },
					stdio: 'pipe',
				},
			);
		const calls = () =>
			readFileSync(log, 'utf8')
				.trim()
				.split('\n')
				.map((line) => JSON.parse(line) as string[]);
		const writes = (all: string[][]) => all.filter((args) => args[0] === 'jira' && args[1] !== 'api');

		run();
		const first = writes(calls());
		expect(
			first
				.filter((args) => args[2] === 'create')
				.map((args) => [args[args.indexOf('--summary') + 1], args.includes('labels=["core"]')]),
		).toEqual([
			['First', true],
			['Second', false],
		]);
		expect(first.filter((args) => args[2] === 'update').map((args) => args.slice(2))).toEqual([
			['update', 'ABC-1', '--description', 'see ABC-2'],
		]);
		const links = first.filter((args) => args[2] === 'links').map((args) => args.slice(3, 6));
		expect(links).toEqual([
			['create', 'ABC-1', 'ABC-2'],
			['delete', expect.any(String)],
			['create', 'ABC-2', 'ABC-1'],
		]);

		const before = calls().length;
		run();
		expect(writes(calls().slice(before))).toEqual([]);
	} finally {
		rmSync(work, { recursive: true, force: true });
	}
});
