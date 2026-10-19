/**
 * Removes the current linked worktree once its branch is safe to leave behind.
 *
 * Usage: node --experimental-strip-types remove-worktree.mts
 *
 * It removes this checkout when it is a linked worktree that no harness manages, the tree is clean, and the branch is
 * pushed or a handoff note exists. The branch stays, and so does the primary checkout. It prints `kept <reason>`, or
 * `removed <path>` then `continue in <primary checkout>`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';

/** Where a harness keeps the worktrees it creates; it removes them itself, and removing one breaks its session. */
const HARNESS_WORKTREES = ['.cursor/worktrees', '.claude/worktrees', '.codex/worktrees'];

export type WorktreeFacts = {
	linked: boolean;
	managed: boolean;
	clean: boolean;
	pushed: boolean;
	handoff: boolean;
};

export function harnessManaged(dir: string): boolean {
	const normalized = `${dir.replaceAll('\\', '/')}/`;
	return HARNESS_WORKTREES.some((folder) => normalized.includes(`/${folder}/`));
}

/** `remove` for a clean linked worktree no harness manages, whose branch is pushed or handed off. */
export function worktreeDecision(facts: WorktreeFacts): 'remove' | 'primary' | 'managed' | 'dirty' | 'unpushed' {
	if (!facts.linked) return 'primary';
	if (facts.managed) return 'managed';
	if (!facts.clean) return 'dirty';
	if (!facts.pushed && !facts.handoff) return 'unpushed';
	return 'remove';
}

function git(cwd: string, args: string[]): string {
	return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

/** Removes the worktree at `cwd` when it is safe, and returns the lines to print. */
export function removeWorktree(cwd: string): string[] {
	const toplevel = git(cwd, ['rev-parse', '--show-toplevel']).trim();
	const gitDir = realpathSync(path.resolve(cwd, git(cwd, ['rev-parse', '--absolute-git-dir']).trim()));
	const common = realpathSync(path.resolve(cwd, git(cwd, ['rev-parse', '--git-common-dir']).trim()));
	const branch = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
	const entries = git(cwd, ['worktree', 'list', '--porcelain']).split('\n\n');
	const own = entries.find((entry) => entry.split('\n')[0] === `worktree ${toplevel}`) ?? '';
	let pushed = false;
	try {
		pushed =
			execFileSync('git', ['rev-list', '--count', '@{upstream}..HEAD'], {
				cwd,
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'ignore'],
			}).trim() === '0';
	} catch {}
	const decision = worktreeDecision({
		linked: gitDir !== common,
		managed: harnessManaged(toplevel) || own.split('\n').some((line) => line.startsWith('locked')),
		clean: git(cwd, ['status', '--porcelain']).trim() === '',
		pushed,
		handoff: existsSync(path.join(common, 'handoff', `${branch}.md`)),
	});
	if (decision !== 'remove') return [`kept ${decision}`];
	const primary = entries[0]?.split('\n')[0]?.replace(/^worktree /, '');
	if (!primary) throw new Error('No primary worktree');
	execFileSync('git', ['-C', primary, 'worktree', 'remove', toplevel], { encoding: 'utf8' });
	return [`removed ${toplevel}`, `continue in ${primary}`];
}

const isMain = process.argv[1] !== undefined && realpathSync(process.argv[1]) === import.meta.filename;

if (isMain) {
	try {
		for (const line of removeWorktree(process.env.INIT_CWD ?? process.cwd())) console.log(line);
	} catch (error) {
		console.error(`[error] ${error instanceof Error ? error.message : error}`);
		process.exit(1);
	}
}
