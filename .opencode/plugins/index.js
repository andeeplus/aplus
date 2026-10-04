/**
 * aplus for OpenCode: registers this repository's skills.
 *
 * The default export is the only export, because OpenCode treats every exported function as a plugin. OpenCode 2
 * loads `index.js` from a plugin directory and calls `setup`; OpenCode 1 calls `server`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const skillsDir = path.resolve(import.meta.dirname, '../../skills');

/** OpenCode 2 takes each skill's resolved fields: the id is the folder, the content is the body without frontmatter. */
function readSkills() {
	return readdirSync(skillsDir).map((id) => {
		const file = path.join(skillsDir, id, 'SKILL.md');
		const [, front = '', content = ''] =
			/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(readFileSync(file, 'utf8')) ?? [];
		const field = (key) => new RegExp(`^${key}:[ \\t]*(.+)$`, 'm').exec(front)?.[1].trim();
		return { id, name: field('name') ?? id, description: field('description'), path: file, content };
	});
}

export default {
	id: 'aplus',

	async setup(ctx) {
		const skills = readSkills();
		await ctx.skill.transform((editor) => {
			for (const skill of skills) editor.add(skill);
		});
	},

	async server() {
		return {
			config: async (config) => {
				config.skills ??= {};
				config.skills.paths ??= [];
				if (!config.skills.paths.includes(skillsDir)) config.skills.paths.push(skillsDir);
			},
		};
	},
};
