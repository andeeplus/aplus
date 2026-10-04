import { expect, test } from 'vitest';
import { anchors, frontmatterErrors, linkErrors, shapeErrors } from './check-skills.mts';

test('anchors follow GitHub heading slugs and skip code blocks', () => {
	expect(anchors("# A bug's scenario\n```sh\n# not a heading\n```\n## Split & stack")).toEqual([
		'a-bugs-scenario',
		'split--stack',
	]);
});

test('linkErrors reports a missing file and a missing anchor, and passes a good link and a URL', () => {
	const exists = (file: string) => file.endsWith('/a/B.md');
	const read = () => '# Real heading';
	const source = '[x](B.md#real-heading) [y](B.md#nope) [z](C.md) [u](https://example.com)';
	expect(linkErrors('/a/A.md', source, exists, read)).toEqual([
		'/a/A.md: no anchor B.md#nope',
		'/a/A.md: missing C.md',
	]);
});

test('frontmatterErrors wants the folder name and a description', () => {
	expect(frontmatterErrors('x', '---\nname: x\ndescription: Does x.\n---\n')).toEqual([]);
	expect(frontmatterErrors('x', '---\nname: y\n---\n')).toEqual([
		'skills/x/SKILL.md: name is "y", expected "x"',
		'skills/x/SKILL.md: missing description',
	]);
});

test('frontmatterErrors rejects a plain value that strict YAML parsers cannot read', () => {
	expect(frontmatterErrors('x', '---\nname: x\ndescription: Does x: fast.\n---\n')).toEqual([
		'skills/x/SKILL.md: description has ": " or " #"; reword it or quote it',
	]);
	expect(frontmatterErrors('x', '---\nname: x\ndescription: "Does x: fast."\n---\n')).toEqual([]);
});

test('shapeErrors wants a Use sentence and the shared sections in order, ignoring other headings and code', () => {
	const good =
		'---\ndescription: Does x. Use for x.\n---\n## Rules\n## Format\n```md\n## Output\n```\n## Flow\n## Output\n';
	expect(shapeErrors('x', good)).toEqual([]);
	expect(shapeErrors('x', '---\ndescription: Does x.\n---\n## Flow\n## Rules\n')).toEqual([
		'skills/x/SKILL.md: description has no sentence starting "Use"',
		'skills/x/SKILL.md: "## Rules" comes after "## Flow"; the order is Rules, References, Script, Flow, Output',
	]);
});
