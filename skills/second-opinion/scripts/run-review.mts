/**
 * Sends a change, already reviewed by its author, to a model from another family for a second review, read-only,
 * and prints its findings.
 *
 * Usage: node --experimental-strip-types run-review.mts --base <ref> --notes <file> --self <model> [--round 1|2|3]
 *        node --experimental-strip-types run-review.mts --base <ref> --notes <file> --harness <h> --model <m> [--round 1|2|3]
 *
 * Run it from inside the repository. `--notes` holds the author's own review: what it found, fixed and left, and in
 * rounds 2 and 3 what was done with each finding of the round before. `--self` is the model the caller runs on. The
 * reviewer is the first `harness:model[@effort]` entry in `APLUS_SECOND_OPINION_REVIEWERS` whose model family differs from
 * it; the variable comes from the environment or the repository's root `.env`. With no such entry, the script writes
 * the prompt to a file, prints its path and exits 2, for the caller to hand to a subagent on another model. `--harness`
 * and `--model` skip the list. An optional `APLUS_SECOND_OPINION_<HARNESS>_API_KEY` is used instead of that harness's CLI
 * login. The reviewer's brief is ../references/brief.md.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

const USAGE =
	'Usage: node --experimental-strip-types run-review.mts --base <ref> --notes <file> (--self <model> | --harness <h> --model <m>) [--round 1|2|3]';

/**
 * @remarks
 * Every harness takes the prompt as one argument, and Linux caps a single argument at 128 KiB. Review a larger
 * change in parts, with a nearer `--base`.
 */
const MAX_PROMPT_BYTES = 120_000;

/**
 * Matches a fast variant such as `grok-4.7-high-fast`, but not Cursor's `[fast=false]` override. Reviews always run
 * on the full model.
 */
const FAST_MODEL = /\bfast\b(?!=false)/i;

/**
 * A trailing `@<effort>` on a model, such as `gpt-6.1-sol@low`. Only these words count, so a dated id such as
 * `claude-opus-4@20250514` stays whole.
 */
const EFFORT = /^(.+)@(minimal|low|medium|high|xhigh|max)$/;

type Reviewer = { harness: string; model: string; effort?: string };

/**
 * The headless, read-only command for each harness.
 *
 * @remarks
 * The prompt goes last. Claude's `--allowedTools` takes several values, so the prompt must follow `-p`, not it.
 * Claude's fast mode is a setting rather than a model id, so it is switched off for the run. Cursor refuses to run
 * headless in an untrusted folder; `--trust` answers that prompt only, and `--mode ask` still keeps it read-only.
 */
const HARNESSES: Partial<Record<string, (prompt: string, model: string, effort?: string) => string[]>> = {
	claude: (prompt, model, effort) => [
		'claude',
		'--model',
		model,
		'--settings',
		'{"fastMode":false}',
		'--permission-mode',
		'dontAsk',
		'--allowedTools',
		'Read,Grep,Glob',
		...(effort ? ['--effort', effort] : []),
		'-p',
		prompt,
	],
	codex: (prompt, model, effort) => [
		'codex',
		'exec',
		'--sandbox',
		'read-only',
		'--model',
		model,
		...(effort ? ['-c', `model_reasoning_effort=${effort}`] : []),
		prompt,
	],
	cursor: (prompt, model) => [
		'cursor-agent',
		'-p',
		'--trust',
		'--mode',
		'ask',
		'--output-format',
		'text',
		'--model',
		model,
		prompt,
	],
	opencode: (prompt, model, effort) => [
		'opencode',
		'run',
		'--agent',
		'plan',
		'--model',
		model,
		...(effort ? ['--variant', effort] : []),
		prompt,
	],
};

/**
 * The variable each harness reads an API key from. `APLUS_SECOND_OPINION_<HARNESS>_API_KEY` is passed to the reviewer under
 * this name, so the coding agent's own key is left alone.
 *
 * @remarks
 * OpenCode keeps one key per provider, set with `opencode auth login`, so it has no entry.
 */
const API_KEY_VARS: Partial<Record<string, string>> = {
	claude: 'ANTHROPIC_API_KEY',
	codex: 'CODEX_API_KEY',
	cursor: 'CURSOR_API_KEY',
};

/**
 * The family of a model id: `claude` for Claude ids and aliases, `gpt` for OpenAI ids, otherwise the first word of
 * the name, after any `provider/` prefix. A reviewer must come from a different family than the author.
 */
export function family(model: string): string {
	const name = (model.split('/').pop() ?? model).toLowerCase();
	const word = /^[a-z]+/.exec(name)?.[0] ?? name;
	if (['claude', 'opus', 'sonnet', 'fable', 'haiku'].includes(word)) return 'claude';
	if (['gpt', 'codex'].includes(word) || /^o\d/.test(name)) return 'gpt';
	return word;
}

/**
 * Parses `APLUS_SECOND_OPINION_REVIEWERS`, a comma-separated list of `harness:model[@effort]`, and checks every entry, so a
 * typo fails even when an earlier entry is picked. A comma inside brackets, as in Cursor's
 * `model[effort=high,fast=false]`, belongs to the id.
 */
function parseReviewers(list: string): Reviewer[] {
	return list
		.split(/,(?![^[]*\])/)
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map((entry) => {
			const [harness, ...rest] = entry.split(':');
			return reviewer(harness, rest.join(':'));
		});
}

/**
 * Splits an optional `@<effort>` off the model and checks the result.
 *
 * @remarks
 * Cursor names the effort in the model id, such as `grok-4.7-high` or `model[effort=low]`, so it takes no suffix.
 */
function reviewer(harness: string, spec: string): Reviewer {
	const [, model = spec, effort] = EFFORT.exec(spec) ?? [];
	if (!HARNESSES[harness]) {
		throw new Error(`The harness "${harness}" is not supported. Use one of ${Object.keys(HARNESSES).join(', ')}.`);
	}
	if (!model || FAST_MODEL.test(model)) {
		throw new Error(
			`The model for ${harness} is ${model ? `"${model}", a fast variant` : 'not set'}. Set an exact model id without "fast"; a harness default or a bare alias can resolve to a fast variant.`,
		);
	}
	if (effort && harness === 'cursor') {
		throw new Error(
			`Cursor names the effort in the model id, such as "${model}[effort=${effort}]", not with @${effort}.`,
		);
	}
	return { harness, model, effort };
}

/**
 * @remarks
 * The diff sits in the prompt so the reviewer needs no shell, which not every harness allows in read-only mode.
 * Untracked files are listed by path for the reviewer to read. The notes and the diff are fenced with a random tag,
 * so a `</diff>` inside the change cannot end its section early.
 */
function buildPrompt(review: {
	brief: string;
	round: string;
	notes: string;
	base: string;
	diff: string;
	untracked: string[];
}): string {
	const { brief, round, notes, base, diff, untracked } = review;
	const tag = randomUUID().slice(0, 8);
	const files = untracked.length > 0 ? untracked.map((file) => `- ${file}`).join('\n') : 'None.';
	return `${brief}\n## This review\n\nRound ${round} of at most 3.\n\nThe author's notes:\n\n<notes-${tag}>\n${notes.trim()}\n</notes-${tag}>\n\nEverything since the merge base with \`${base}\`, committed or not:\n\n<diff-${tag}>\n${diff}</diff-${tag}>\n\nNew untracked files, not in the diff; read them:\n\n${files}\n`;
}

/**
 * @remarks
 * `argv[1]` is resolved because the script is often run through a linked skill folder, while
 * `import.meta.filename` is always the real path.
 */
const isMain = process.argv[1] !== undefined && realpathSync(process.argv[1]) === import.meta.filename;

if (isMain) {
	const { values } = parseArgs({
		args: process.argv.slice(2).filter((arg) => arg !== '--'),
		options: {
			base: { type: 'string' },
			notes: { type: 'string' },
			round: { type: 'string', default: '1' },
			harness: { type: 'string' },
			model: { type: 'string' },
			self: { type: 'string' },
		},
	});
	if (!values.base || !values.notes) throw new Error(USAGE);
	if (!['1', '2', '3'].includes(values.round)) {
		throw new Error(
			'There are at most three rounds: --round 1 looks for defects, --round 2 checks the fixes from round 1, and an optional --round 3 checks the fixes from round 2. After the last round, report what is left instead of asking again.',
		);
	}
	if ((values.harness === undefined) !== (values.model === undefined))
		throw new Error('Pass --harness and --model together.');
	if (values.harness === undefined && !values.self) {
		throw new Error(`--self needs the model you run on, so the reviewer comes from another family. ${USAGE}`);
	}
	const notes = readFileSync(path.resolve(values.notes), 'utf8');
	if (!notes.trim()) {
		throw new Error(
			`${values.notes} is empty. Write what your own review found, fixed and left before asking for a second one.`,
		);
	}

	const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
	const root = git('rev-parse', '--show-toplevel').trim();
	try {
		process.loadEnvFile(path.join(root, '.env'));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
	}

	let picked: Reviewer | undefined;
	if (values.harness !== undefined && values.model !== undefined) {
		picked = reviewer(values.harness, values.model);
	} else {
		const own = family(values.self ?? '');
		picked = parseReviewers(process.env.APLUS_SECOND_OPINION_REVIEWERS ?? '').find(
			({ model }) => family(model) !== own,
		);
	}

	const diff = git('-C', root, 'diff', git('-C', root, 'merge-base', values.base, 'HEAD').trim());
	const untracked = git('-C', root, 'ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean);
	if (!diff && untracked.length === 0) {
		console.log(`Nothing to review: no changes since the merge base with ${values.base}.`);
		process.exit(0);
	}

	const brief = readFileSync(path.join(import.meta.dirname, '../references/brief.md'), 'utf8');
	const prompt = buildPrompt({ brief, round: values.round, notes, base: values.base, diff, untracked });
	const bytes = Buffer.byteLength(prompt);
	if (bytes > MAX_PROMPT_BYTES) {
		throw new Error(
			`The change is ${bytes} bytes, over the ${MAX_PROMPT_BYTES}-byte prompt limit. Use a nearer --base.`,
		);
	}

	if (!picked) {
		const file = path.join(mkdtempSync(path.join(os.tmpdir(), 'second-opinion-')), 'prompt.md');
		writeFileSync(file, prompt);
		console.error(
			`No reviewer from a family other than ${family(values.self ?? '')} is set in APLUS_SECOND_OPINION_REVIEWERS (${path.join(root, '.env')}). The review prompt is in ${file}: give it to a fresh, read-only subagent on another model, or run again with --harness and --model.`,
		);
		process.exit(2);
	}

	const { harness, model, effort } = picked;
	const apiKey = process.env[`APLUS_SECOND_OPINION_${harness.toUpperCase()}_API_KEY`];
	const apiKeyVar = API_KEY_VARS[harness];
	if (apiKey && !apiKeyVar) console.error(`${harness} takes no API key here; log in with its own CLI.`);
	const env = apiKey && apiKeyVar ? { ...process.env, [apiKeyVar]: apiKey } : process.env;

	const [command, ...args] = HARNESSES[harness]!(prompt, model, effort);
	const result = spawnSync(command, args, { cwd: root, env, stdio: ['ignore', 'inherit', 'inherit'] });
	if (result.error) {
		console.error(`Could not run ${command}. Install it and log in.`);
		throw result.error;
	}
	process.exitCode = result.status ?? 1;
}
