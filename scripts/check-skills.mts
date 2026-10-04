/**
 * Checks every skill: `SKILL.md` has a `name` equal to its folder and a `description`, a skill that is not vendored
 * (no `LICENSE` beside it) follows the shape in AGENTS.md, and every relative
 * Markdown link in `skills/`, `README.md` and `AGENTS.md` resolves, anchors included. Files in `assets/` are
 * templates that link relative to where they are copied, so they are skipped.
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

/** Like `existsSync`, but exact about letter case, so a link that works on macOS but not on Linux fails. */
function existsExact(file: string): boolean {
	return (
		existsSync(file) &&
		(file === path.parse(file).root || readdirSync(path.dirname(file)).includes(path.basename(file)))
	);
}

export function linkErrors(
	file: string,
	source: string,
	exists: (file: string) => boolean = existsExact,
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
	// A plain YAML value ends at ": " or " #", so a strict parser rejects the whole frontmatter and drops the skill.
	for (const [, key, value] of front.matchAll(/^([\w-]+):[ \t]*([^'"|>\s].*)$/gm)) {
		if (/: | #/.test(value))
			errors.push(`skills/${folder}/SKILL.md: ${key} has ": " or " #"; reword it or quote it`);
	}
	return errors;
}

const SECTIONS = ['Rules', 'References', 'Script', 'Flow', 'Output'];

/** The shape AGENTS.md sets: a description with a `Use` sentence, and the shared sections in their order. */
export function shapeErrors(folder: string, source: string): string[] {
	const file = `skills/${folder}/SKILL.md`;
	const errors = [];
	const description = /^description:[ \t]*(.*)$/m.exec(source)?.[1] ?? '';
	if (!/(^|\. )Use /.test(description)) errors.push(`${file}: description has no sentence starting "Use"`);
	const order = source
		.replace(FENCED, '')
		.split('\n')
		.filter((line) => line.startsWith('## '))
		.map((line) => SECTIONS.indexOf(line.slice(3).trim()))
		.filter((index) => index !== -1);
	for (let i = 1; i < order.length; i++) {
		if (order[i] <= order[i - 1]) {
			errors.push(
				`${file}: "## ${SECTIONS[order[i]]}" comes after "## ${SECTIONS[order[i - 1]]}"; the order is ${SECTIONS.join(', ')}`,
			);
		}
	}
	return errors;
}

function markdownFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const full = path.join(dir, entry);
		if (statSync(full).isDirectory()) return entry === 'assets' ? [] : markdownFiles(full);
		return full.endsWith('.md') ? [full] : [];
	});
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
	const skillsDir = path.join(root, 'skills');
	const errors = [
		...readdirSync(skillsDir).flatMap((folder) => {
			const source = readFileSync(path.join(skillsDir, folder, 'SKILL.md'), 'utf8');
			const vendored = existsSync(path.join(skillsDir, folder, 'LICENSE'));
			return [...frontmatterErrors(folder, source), ...(vendored ? [] : shapeErrors(folder, source))];
		}),
		...[...markdownFiles(skillsDir), path.join(root, 'README.md'), path.join(root, 'AGENTS.md')].flatMap((file) =>
			linkErrors(file, readFileSync(file, 'utf8')),
		),
	].map((error) => error.replaceAll(`${root}/`, ''));
	for (const error of errors) console.error(`[error] ${error}`);
	if (errors.length > 0) process.exit(1);
}
