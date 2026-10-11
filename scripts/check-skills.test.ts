import { expect, test } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { anchors, frontmatterErrors, isVendored, linkErrors, shapeErrors } from './check-skills.mts';

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

test('isVendored matches the flag at the shallowest metadata indent', () => {
	const skill = (metadata: string) => `---\nname: x\ndescription: Does x. Use x.\n${metadata}---\n# X\n`;
	expect(isVendored(skill('metadata:\n        note: deeper\n    vendored: "true"\n'))).toBe(true);
	expect(isVendored(skill('metadata:\n    other:\n        vendored: "true"\n'))).toBe(false);
});

test.each([
	{
		name: 'a license alone keeps shape validation',
		metadata: '',
		license: true,
		extra: '',
		passes: false,
		error: 'description has no sentence starting "Use"',
	},
	{
		name: 'explicit vendoring exempts shape validation',
		metadata: 'metadata:\n    vendored: "true"\n',
		license: false,
		extra: '',
		passes: true,
		error: '',
	},
	{
		name: 'a metadata block like code-quality exempts shape validation',
		metadata: "metadata:\n    author: cursor\n    vendored: 'true'\n",
		license: false,
		extra: '',
		passes: true,
		error: '',
	},
	{
		name: 'a false vendoring flag keeps shape validation',
		metadata: 'metadata:\n    vendored: "false"\n',
		license: true,
		extra: '',
		passes: false,
		error: 'description has no sentence starting "Use"',
	},
	{
		name: 'a nested flag does not exempt the entry point',
		metadata: 'metadata:\n    other:\n        vendored: "true"\n',
		license: true,
		extra: '',
		passes: false,
		error: 'description has no sentence starting "Use"',
	},
	{
		name: 'body text does not exempt the entry point',
		metadata: '',
		license: false,
		extra: 'metadata:\n    vendored: "true"\n',
		passes: false,
		error: 'description has no sentence starting "Use"',
	},
	{
		name: 'vendored entry points still validate links',
		metadata: 'metadata:\n    vendored: "true"\n',
		license: true,
		extra: '[missing](missing.md)',
		passes: false,
		error: 'missing missing.md',
	},
	{
		name: 'vendored entry points still validate frontmatter',
		metadata: 'metadata:\n    vendored: "true"\n',
		license: true,
		extra: '',
		skillName: 'y',
		passes: false,
		error: 'name is "y", expected "x"',
	},
])('$name', ({ metadata, license, extra, passes, error, skillName = 'x' }) => {
	const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'aplus-skill-check-')));
	try {
		mkdirSync(path.join(root, 'scripts'));
		mkdirSync(path.join(root, 'skills/x'), { recursive: true });
		copyFileSync(path.join(import.meta.dirname, 'check-skills.mts'), path.join(root, 'scripts/check-skills.mts'));
		writeFileSync(path.join(root, 'README.md'), '');
		writeFileSync(path.join(root, 'AGENTS.md'), '');
		writeFileSync(
			path.join(root, 'skills/x/SKILL.md'),
			`---\nname: ${skillName}\ndescription: Does x.\n${metadata}---\n# X\n${extra}\n`,
		);
		if (license) writeFileSync(path.join(root, 'skills/x/LICENSE'), 'MIT');
		const result = spawnSync(
			process.execPath,
			['--experimental-strip-types', path.join(root, 'scripts/check-skills.mts')],
			{ encoding: 'utf8' },
		);
		expect(result.status).toBe(passes ? 0 : 1);
		if (!passes) expect(result.stderr).toContain(error);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
