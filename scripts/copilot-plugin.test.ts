import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');

test('the Copilot plugin manifest points at every skill', () => {
	const plugin = JSON.parse(readFileSync(path.join(root, '.github/plugin/plugin.json'), 'utf8'));
	const marketplace = JSON.parse(readFileSync(path.join(root, '.github/plugin/marketplace.json'), 'utf8'));
	expect(marketplace).toMatchObject({
		name: 'andeeplus',
		plugins: [{ name: 'aplus', source: './' }],
	});
	expect(plugin.name).toBe('aplus');
	const skillsDir = path.resolve(root, plugin.skills);
	const folders = readdirSync(skillsDir).filter((entry) => statSync(path.join(skillsDir, entry)).isDirectory());
	expect(folders.length).toBeGreaterThan(0);
	for (const folder of folders) expect(statSync(path.join(skillsDir, folder, 'SKILL.md')).isFile()).toBe(true);
});
