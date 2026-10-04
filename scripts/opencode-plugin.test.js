import { readdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import plugin from '../.opencode/plugins/index.js';

const skillsDir = path.resolve(import.meta.dirname, '../skills');
const folders = readdirSync(skillsDir);

test('OpenCode 2: setup adds every skill with its frontmatter fields and body', async () => {
	const added = [];
	await plugin.setup({ skill: { transform: async (edit) => edit({ add: (skill) => added.push(skill) }) } });
	expect(added.map((skill) => skill.id)).toEqual(folders);
	const debug = added.find((skill) => skill.id === 'debug');
	expect(debug).toMatchObject({ name: 'debug', path: path.join(skillsDir, 'debug', 'SKILL.md') });
	expect(debug.description).toMatch(/^Find and fix a bug/);
	expect(debug.content).toMatch(/^\s*# Debug/);
});

test('OpenCode 1: the config hook adds the skills folder once and keeps existing paths', async () => {
	const { config } = await plugin.server();
	const resolved = { skills: { paths: ['/other'] } };
	await config(resolved);
	await config(resolved);
	expect(resolved.skills.paths).toEqual(['/other', skillsDir]);
});
