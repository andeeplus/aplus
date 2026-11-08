import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { checkTracks, parseTracks } from './check-tracks.mts';

const SCRIPT = path.join(import.meta.dirname, 'check-tracks.mts');

const PLAN = `# Tracks

## errors: Route errors carry their cause
- #12 Parse params once
- #14 Reject unknown params (blocked by #12, #9)

## cache: Invalidate on route change
- #20 Key the cache by route (blocked by #14)

## docs: Document the router
- #30 Write the guide
`;

test('parses tracks, issues and blockers', () => {
	expect(parseTracks(PLAN)).toEqual([
		{
			key: 'errors',
			issues: [
				{ ref: '#12', blockedBy: [] },
				{ ref: '#14', blockedBy: ['#12', '#9'] },
			],
		},
		{ key: 'cache', issues: [{ ref: '#20', blockedBy: ['#14'] }] },
		{ key: 'docs', issues: [{ ref: '#30', blockedBy: [] }] },
	]);
});

test('prints each base and the blockers outside the plan', () => {
	expect(checkTracks(parseTracks(PLAN), ['#12', '#14', '#20', '#30'])).toEqual({
		errors: [],
		lines: ['errors: 2 issues, base', 'cache: 1 issues, stacks on errors', 'docs: 1 issues, base', 'outside #9'],
	});
});

test('stacks on the latest blocking track, and waits only for blocking tracks outside that stack', () => {
	const chain = `## a: A\n- #1 x\n## b: B\n- #2 y (blocked by #1)\n## c: C\n- #3 z (blocked by #1, #2)\n`;
	expect(checkTracks(parseTracks(chain)).lines.at(-1)).toBe('c: 1 issues, stacks on b');
	const split = `## a: A\n- #1 x\n## b: B\n- #2 y\n## c: C\n- #3 z (blocked by #1, #2)\n`;
	expect(checkTracks(parseTracks(split)).lines.at(-1)).toBe('c: 1 issues, stacks on b, waits for a');
	const deep = `${split}## d: D\n- #4 w (blocked by #3, #1)\n`;
	expect(checkTracks(parseTracks(deep)).lines.at(-1)).toBe('d: 1 issues, stacks on c');
});

test('a reason line or another heading adds no issue', () => {
	const plan = `## a: A\n> Shares the parser\n- #1 x\n### Why\n- Shares the parser\n## Notes\n- not an issue\n`;
	expect(parseTracks(plan)).toEqual([{ key: 'a', issues: [{ ref: '#1', blockedBy: [] }] }]);
});

test('a track waiting on several tracks names each', () => {
	const plan = `## a: A\n- #1 x\n## b: B\n- #2 y\n## c: C\n- #3 z\n## d: D\n- #4 w (blocked by #1, #2, #3)\n`;
	expect(checkTracks(parseTracks(plan)).lines.at(-1)).toBe('d: 1 issues, stacks on c, waits for a, b');
});

test('flags a track over the soft limit without failing', () => {
	const big = `## a: A\n- #1 x\n- #2 y\n- #3 z\n- #4 w\n`;
	expect(checkTracks(parseTracks(big))).toEqual({ errors: [], lines: ['a: 4 issues, base, over the soft limit'] });
});

test('rejects duplicates, empty tracks, late blockers and a plan that differs from the program', () => {
	const bad = `## a: A\n- #1 x (blocked by #2)\n- #2 y\n## b: B\n## c: C\n- #1 again\n`;
	expect(checkTracks(parseTracks(bad), ['#1', '#2', '#3']).errors).toEqual([
		'b: no issues',
		'#1: in more than one place',
		'#3: program issue missing from the plan',
		'#1: blocked by #2, which comes later',
	]);
	expect(checkTracks([]).errors).toEqual(['no "## <track-key>: <title>" heading']);
	const twice = `## a: A\n- #1 x (blocked by #1)\n## a: B\n- #2 y\n`;
	expect(checkTracks(parseTracks(twice)).errors).toEqual([
		'a: track key in more than one place',
		'#1: blocked by itself',
	]);
});

test('the command line exits 1 on errors and prints the bases otherwise', () => {
	const dir = mkdtempSync(path.join(os.tmpdir(), 'tracks-'));
	try {
		const file = path.join(dir, 'tracks.md');
		writeFileSync(file, PLAN);
		const ok = spawnSync('node', ['--experimental-strip-types', SCRIPT, file], { encoding: 'utf8' });
		expect(ok.status).toBe(0);
		expect(ok.stdout).toContain('cache: 1 issues, stacks on errors\n');
		const missing = spawnSync('node', ['--experimental-strip-types', SCRIPT, file, '--expect', '#12,#14,#20'], {
			encoding: 'utf8',
		});
		expect(missing.status).toBe(1);
		expect(missing.stderr).toBe('[error] #30: not a program issue\n');
		const absent = spawnSync('node', ['--experimental-strip-types', SCRIPT, path.join(dir, 'none.md')], {
			encoding: 'utf8',
		});
		expect(absent.status).toBe(1);
		expect(absent.stderr).toMatch(/^\[error\] ENOENT/);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
