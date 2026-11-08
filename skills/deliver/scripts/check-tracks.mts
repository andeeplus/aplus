/**
 * Checks a program's track plan and prints the base of each track.
 *
 * Usage: node --experimental-strip-types check-tracks.mts <tracks.md> [--expect <ref>,<ref>...]
 *
 * The plan has one `## <track-key>: <title>` per track, in delivery order, and one line per issue under it, in build
 * order: `- <ref> <title>`, ending with `(blocked by <ref>, <ref>)` when it has blockers. A ref is the issue's id in the
 * tracker's form, such as `#12` or `PROJ-12`.
 *
 * It fails when an issue appears twice, a track is empty, a blocker comes later in the plan, or, with `--expect`, the
 * plan misses a program issue or names another. It prints one line per track: `base` when it builds on the
 * integration branch, `stacks on <key>` when its blockers sit in one track's chain, or `waits for <keys>` when they
 * sit in tracks that must merge first. Then `outside <refs>`: blockers not in the plan, which must already be merged.
 */
import { readFileSync, realpathSync } from 'node:fs';
import { parseArgs } from 'node:util';

export type Track = { key: string; title: string; issues: { ref: string; blockedBy: string[] }[] };

const HEADING = /^## +([^:\s]+): *(.+)$/;
const ISSUE = /^[-*] +(\S+)(.*)$/;
const BLOCKED = /\(blocked by ([^)]+)\)\s*$/i;

export function parseTracks(markdown: string): Track[] {
	const tracks: Track[] = [];
	for (const line of markdown.split('\n')) {
		const heading = HEADING.exec(line);
		if (heading) {
			tracks.push({ key: heading[1], title: heading[2].trim(), issues: [] });
			continue;
		}
		const issue = ISSUE.exec(line);
		if (!issue || !tracks.length) continue;
		const blocked = BLOCKED.exec(issue[2]);
		const blockedBy = blocked
			? blocked[1]
					.split(',')
					.map((ref) => ref.trim())
					.filter(Boolean)
			: [];
		tracks.at(-1)?.issues.push({ ref: issue[1], blockedBy });
	}
	return tracks;
}

export type Plan = { errors: string[]; lines: string[] };

export function checkTracks(tracks: Track[], expect?: string[]): Plan {
	const errors: string[] = [];
	const position = new Map<string, { track: number; index: number }>();
	if (!tracks.length) errors.push('no "## <track-key>: <title>" heading');
	tracks.forEach((track, t) => {
		if (!track.issues.length) errors.push(`${track.key}: no issues`);
		track.issues.forEach((issue, index) => {
			if (position.has(issue.ref)) errors.push(`${issue.ref}: in more than one place`);
			else position.set(issue.ref, { track: t, index });
		});
	});
	if (expect) {
		const planned = new Set(position.keys());
		const wanted = new Set(expect);
		for (const ref of wanted) if (!planned.has(ref)) errors.push(`${ref}: program issue missing from the plan`);
		for (const ref of planned) if (!wanted.has(ref)) errors.push(`${ref}: not a program issue`);
	}

	const outside = new Set<string>();
	const below: Set<number>[] = [];
	const lines: string[] = [];
	tracks.forEach((track, t) => {
		const needs = new Set<number>();
		track.issues.forEach((issue, index) => {
			for (const blocker of issue.blockedBy) {
				const at = position.get(blocker);
				if (!at) outside.add(blocker);
				else if (at.track > t || (at.track === t && at.index >= index))
					errors.push(`${issue.ref}: blocked by ${blocker}, which comes later`);
				else if (at.track < t) needs.add(at.track);
			}
		});
		const top = Math.max(-1, ...needs);
		const chain = top === -1 ? new Set<number>() : new Set([top, ...below[top]]);
		const waits = [...needs].filter((need) => !chain.has(need));
		below[t] = waits.length || top === -1 ? new Set() : chain;
		const base =
			top === -1
				? 'base'
				: waits.length
					? `waits for ${[...needs].map((need) => tracks[need].key).join(', ')}`
					: `stacks on ${tracks[top].key}`;
		lines.push(`${track.key}: ${track.issues.length} issues, ${base}`);
	});
	if (outside.size) lines.push(`outside ${[...outside].join(', ')}`);
	return { errors, lines };
}

const isMain = process.argv[1] !== undefined && realpathSync(process.argv[1]) === import.meta.filename;

if (isMain) {
	const { values, positionals } = parseArgs({ options: { expect: { type: 'string' } }, allowPositionals: true });
	if (positionals.length !== 1) {
		console.error('[error] Usage: check-tracks.mts <tracks.md> [--expect <ref>,<ref>...]');
		process.exit(1);
	}
	const expect = values.expect
		?.split(',')
		.map((ref) => ref.trim())
		.filter(Boolean);
	const { errors, lines } = checkTracks(parseTracks(readFileSync(positionals[0], 'utf8')), expect);
	for (const error of errors) console.error(`[error] ${error}`);
	if (errors.length) process.exit(1);
	for (const line of lines) console.log(line);
}
