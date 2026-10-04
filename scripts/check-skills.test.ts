import { expect, test } from 'vitest';
import { anchors, frontmatterErrors, linkErrors } from './check-skills.mts';

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
