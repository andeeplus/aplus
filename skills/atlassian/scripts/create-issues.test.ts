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
