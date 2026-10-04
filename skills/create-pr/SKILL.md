---
name: create-pr
description: Open a pull request the project's way, on any host. Use to open a PR, stack a PR on the one it depends on, split finished work into several PRs, answer a review, merge when asked, and close the issues a PR resolves.
---

# Create PR

Commands and formats come from the skill for the repository's host, such as [github](../github/SKILL.md). The integration branch, merge method and release-note rules come from the project's `AGENTS.md`.

## Open

1. Get a `ready to ship` verdict from [final-review](../final-review/SKILL.md) for the branch as it is now.
2. Write the title, and the release note the project requires, with [commit-expert](../commit-expert/SKILL.md).
3. Fill in the project's PR template in a scratch file outside the tree. Link each issue the PR resolves.
4. Ask, then push and open it against the integration branch.

One PR per issue, on a kebab-case branch with a type prefix, such as `fix/stale-export-pages`.

## More

| Task                                                              | Read                                                             |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| The issue is blocked by one whose PR is open; split finished work | [references/stacks.md](references/stacks.md)                     |
| Answer a review, merge, close the issues                          | [references/review-and-merge.md](references/review-and-merge.md) |
