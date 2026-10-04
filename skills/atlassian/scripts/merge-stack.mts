/**
 * Merges the bottom pull request of a stack on Bitbucket: first retargets every open PR stacked on it to its
 * destination, reads each back to confirm, then merges.
 *
 * Usage: node --experimental-strip-types merge-stack.mts <repo> <pr id> --strategy merge_commit|squash|fast_forward
 *        [--workspace <slug>] [--apply]
 *
 * Without `--apply` it only prints the plan. Run it again for the next PR, which is then the bottom of what is
 * left. Needs `atlassian-cli` with a Bitbucket profile.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { parseArgs } from 'node:util';

export type PullRequest = {
	id: number;
	title: string;
	state: string;
	source: { branch: { name: string } };
	destination: { branch: { name: string } };
};

/** Why `pr` cannot be the bottom of a stack to merge, if it cannot. */
export function problem(pr: PullRequest): string | undefined {
	return pr.state === 'OPEN' ? undefined : `#${pr.id} is ${pr.state}, not OPEN`;
}

/** The open PRs that target `pr`'s source branch, which `pr` merging would leave pointing at a deleted base. */
export function stackedOn(pr: PullRequest, open: PullRequest[]): PullRequest[] {
	return open.filter(
		(candidate) => candidate.id !== pr.id && candidate.destination.branch.name === pr.source.branch.name,
	);
}

type Target = { repo: string; workspace?: string };

function bb(target: Target, ...args: string[]): string {
	const workspace = target.workspace ? ['--workspace', target.workspace] : [];
	return execFileSync('atlassian-cli', ['-f', 'json', 'bb', ...args, ...workspace], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'inherit'],
	});
}

function api<T>(target: Target, endpoint: string, ...options: string[]): T {
	const base = `/2.0/repositories/{workspace}/${target.repo}/pullrequests`;
	return JSON.parse(bb(target, 'api', `${base}${endpoint}`, '--repo', target.repo, ...options)) as T;
}

function readPullRequest(target: Target, id: number): PullRequest {
	return api<PullRequest>(target, `/${id}`);
}

function main(): void {
	const { values, positionals } = parseArgs({
		args: process.argv.slice(2).filter((arg) => arg !== '--'),
		options: {
			strategy: { type: 'string' },
			workspace: { type: 'string' },
			apply: { type: 'boolean', default: false },
		},
		allowPositionals: true,
	});
	const [repo, idText] = positionals;
	if (!repo || !idText || !['merge_commit', 'squash', 'fast_forward'].includes(values.strategy ?? '')) {
		throw new Error(
			'Usage: merge-stack.mts <repo> <pr id> --strategy merge_commit|squash|fast_forward [--workspace <slug>] [--apply]',
		);
	}
	const target: Target = { repo, workspace: values.workspace };
	const pr = readPullRequest(target, Number(idText));
	const blocked = problem(pr);
	if (blocked) throw new Error(blocked);

	// ponytail: one page of 50 open PRs; page through `next` if a repository has more.
	const open = api<{ values: PullRequest[] }>(target, '', '--query', 'state=OPEN', '--query', 'pagelen=50').values;
	const children = stackedOn(pr, open);
	const base = pr.destination.branch.name;
	for (const child of children)
		console.log(`retarget #${child.id} ${child.title}: ${child.destination.branch.name} -> ${base}`);
	console.log(`merge    #${pr.id} ${pr.title} into ${base} (${values.strategy})`);
	if (!values.apply) {
		console.log('\nDry run. Add --apply to do it.');
		return;
	}

	for (const child of children) {
		api(target, `/${child.id}`, '-X', 'put', '-d', JSON.stringify({ destination: { branch: { name: base } } }));
		const now = readPullRequest(target, child.id).destination.branch.name;
		if (now !== base) throw new Error(`#${child.id} still targets ${now}, not ${base}. Nothing was merged.`);
	}
	bb(target, 'pr', 'merge', repo, String(pr.id), '--strategy', values.strategy!, '--message', pr.title);
	console.log(`merged #${pr.id}`);
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === import.meta.filename) {
	try {
		main();
	} catch (error) {
		console.error(`[error] ${error instanceof Error ? error.message : error}`);
		process.exit(1);
	}
}
