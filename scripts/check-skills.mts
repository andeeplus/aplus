/**
 * Checks every skill: `SKILL.md` has a `name` equal to its folder and a `description`, and every relative
 * Markdown link in `skills/`, `README.md` and `AGENTS.md` resolves, anchors included.
 *
 * Usage: node --experimental-strip-types scripts/check-skills.mts
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const FENCED = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm;

export function slug(heading: string): string {
	return heading
		.toLowerCase()
		.replace(/[`*]/g, '')
		.replace(/[^\p{L}\p{N} _-]/gu, '')
		.replace(/ /g, '-');
}

export function anchors(source: string): string[] {
	return source
		.replace(FENCED, '')
		.split('\n')
		.filter((line) => /^#+ /.test(line))
		.map((line) => slug(line.replace(/^#+ /, '')));
}

export function linkErrors(
	file: string,
	source: string,
	exists: (file: string) => boolean = existsSync,
	read = (f: string) => readFileSync(f, 'utf8'),
) {
	const errors: string[] = [];
	for (const [, target] of source.replace(FENCED, '').matchAll(/\]\(([^)\s]+)\)/g)) {
		if (/^[a-z]+:/.test(target)) continue;
		const [relative, anchor] = target.split('#');
		const resolved = relative ? path.resolve(path.dirname(file), relative) : file;
		if (!exists(resolved)) errors.push(`${file}: missing ${target}`);
		else if (anchor && !anchors(read(resolved)).includes(anchor)) errors.push(`${file}: no anchor ${target}`);
	}
	return errors;
}

export function frontmatterErrors(folder: string, source: string): string[] {
	const front = /^---\n([\s\S]*?)\n---/.exec(source)?.[1] ?? '';
	const name = /^name:[ \t]*(.+)$/m.exec(front)?.[1].trim();
	const errors = [];
	if (name !== folder) errors.push(`skills/${folder}/SKILL.md: name is "${name}", expected "${folder}"`);
	if (!/^description:[ \t]*\S/m.test(front)) errors.push(`skills/${folder}/SKILL.md: missing description`);
	return errors;
}

function markdownFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const full = path.join(dir, entry);
		if (statSync(full).isDirectory()) return markdownFiles(full);
		return full.endsWith('.md') ? [full] : [];
	});
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
	const skillsDir = path.join(root, 'skills');
	const errors = [
		...readdirSync(skillsDir).flatMap((folder) =>
			frontmatterErrors(folder, readFileSync(path.join(skillsDir, folder, 'SKILL.md'), 'utf8')),
		),
		...[...markdownFiles(skillsDir), path.join(root, 'README.md'), path.join(root, 'AGENTS.md')].flatMap((file) =>
			linkErrors(file, readFileSync(file, 'utf8')),
		),
	].map((error) => error.replaceAll(`${root}/`, ''));
	for (const error of errors) console.error(`[error] ${error}`);
	if (errors.length > 0) process.exit(1);
}
