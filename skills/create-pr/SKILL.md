---
name: create-pr
description: Open a pull request the project's way, on any host. Use to open a PR, stack a PR on the one it depends on, split finished work into several PRs, answer a review, merge when asked, and close the issues a PR resolves.
---

# Create PR

A PR opens only on a `ready to ship` verdict, and merges only when the user asks.

Commands and formats come from the skill for the project's host, such as [github](../github/SKILL.md).

**Project specifics** (the integration branch, the merge method, release-note rules, whether work needs an issue) come from the project's `AGENTS.md` and the project skill it names.

## Rules

- **One PR per issue,** on a kebab-case branch named type, issue, then slug, such as `fix/12-stale-export-pages`. Every commit on it names the issue in a `Refs:` footer, as [commit-expert](../commit-expert/SKILL.md) says; the host skill gives the issue's form.
- **Without an issue,** where the project allows it, use a `type/slug` branch and no footer.

## References

| Task                                                              | Read                                                             |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| The issue is blocked by one whose PR is open; split finished work | [references/stacks.md](references/stacks.md)                     |
| Answer a review, merge, close the issues                          | [references/review-and-merge.md](references/review-and-merge.md) |

## Open

1. Get a `ready to ship` verdict from [final-review](../final-review/SKILL.md) for the branch as it is now.
2. Write the title, and the release note the project requires, with [commit-expert](../commit-expert/SKILL.md).
3. Fill in the project's PR template in a scratch file outside the tree. Link each issue the PR resolves.
4. Ask, then push and open it against the integration branch.
