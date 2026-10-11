---
name: create-pr
description: Open a pull request the project's way, on any host. Use to open a PR, stack a PR on the one it depends on, split finished work into several PRs, answer a review, merge when asked, and close the issues a PR resolves.
---

# Create PR

A PR opens only on a `ready to ship` verdict, and merges only when the user asks.

Commands and formats come from the skill for the project's host, such as [github](../github/SKILL.md).

## Rules

- **Read the contribution guidance and PR template.** Resolve the target branch and merge method through the host skill, and release-note requirements through [commit-expert](../commit-expert/SKILL.md). Use the documented default when the project states none.

- **Open one PR per issue.** Every commit on it names the issue in a `Refs:` footer, as [commit-expert](../commit-expert/SKILL.md) says; the host skill gives the issue's form. Where the project allows work without an issue, omit the footer.
- **Name the branch `type/ticket-slug`.** The type is the kind of change, such as `feat`, `fix` or `refactor`, and the ticket is the issue key in the host's form. With no issue, use `type/slug`.

## References

| Task                                                              | Read                                                             |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| The issue is blocked by one whose PR is open; split finished work | [references/stacks.md](references/stacks.md)                     |
| Answer a review, merge, close the issues                          | [references/review-and-merge.md](references/review-and-merge.md) |

## Open

1. Get a `ready to ship` verdict from [final-review](../final-review/SKILL.md) for the branch as it is now.
2. Write the title, and the release note the project requires, with [commit-expert](../commit-expert/SKILL.md).
3. Fill in the project's PR template in a scratch file outside the tree. Link each issue the PR resolves.
4. Push and open it against the integration branch.
