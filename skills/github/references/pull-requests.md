# Pull requests

## Before opening

- Run [final-review](../../final-review/SKILL.md). Open the PR only on a `ready to ship` verdict.
- Write commit messages and the PR title with [commit-expert](../../commit-expert/SKILL.md).
- Write the release note the project requires for a user-facing change, such as a changeset, with [commit-expert](../../commit-expert/SKILL.md#release-notes).

## Split and stack

- **One PR per issue,** and one reviewable decision per PR.
- **Branch names** are kebab-case with a type prefix, such as `fix/stale-export-pages` or `refactor/extract-effect-registry`. Leave out internal ids such as audit numbers.
- **An independent PR** branches from the integration branch and targets it.
- **A dependent PR** joins a stack on the PR it needs, as [stacks.md](stacks.md) shows. "Blocked by" between two issues means exactly this: while the blocker's PR is open, the blocked issue's PR stacks on it. A blocker without a PR, such as an unanswered decision, is not a stack: wait for it.
- **Splitting finished work** into several PRs: commit everything to a local backup branch, build each branch from it with `git checkout <backup> -- <paths>`, confirm with `git diff <top branch> <backup>` that nothing is lost, then delete the backup.

## Open

1. Fill in `.github/pull_request_template.md` in a scratch file outside the tree. Keep its sections.
2. List each issue the PR resolves as `Closes #<n>`.
3. Ask the user, then push and open the PR with [cli.md: Pull requests](cli.md#pull-requests). For a stacked PR, follow [stacks.md](stacks.md).

## After opening

- **Updates:** edit the body from the scratch file.
- **Answer a review:**
    1. Fix the code on the branch and run [final-review](../../final-review/SKILL.md).
    2. Commit with [commit-expert](../../commit-expert/SKILL.md).
    3. Ask the user, then push.
    4. Reply on each thread with what changed, not a restatement of the comment ([cli.md: Reviews](cli.md#reviews)). Leave resolving threads to the reviewer.
- **Merge, only when asked,** with the method the project specifies. A stack merges as [stacks.md](stacks.md) shows.
- **Close the issues.** `Closes #<n>` closes an issue only when the PR merges into the default branch. When it merged into another branch, close each issue yourself with a comment naming the PR.
