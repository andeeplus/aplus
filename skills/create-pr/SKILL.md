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

Prefer one PR per issue, on a kebab-case branch named type, issue, then slug, such as `fix/12-stale-export-pages`. Every commit on it names the issue in a `Refs:` footer, as [commit-expert](../commit-expert/SKILL.md) says. The host skill gives the issue's form. Whether an issue is required comes from the project's `AGENTS.md`; where none is, work without one goes on `type/slug` with no footer.

## More

| Task                                                              | Read                                                             |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| The issue is blocked by one whose PR is open; split finished work | [references/stacks.md](references/stacks.md)                     |
| Answer a review, merge, close the issues                          | [references/review-and-merge.md](references/review-and-merge.md) |
