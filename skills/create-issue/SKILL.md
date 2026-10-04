---
name: create-issue
description: Write issues that stand on their own, on any tracker. Use to file a bug, task or decision, turn findings into issues, or plan a change as a tracking issue with ordered child issues.
---

# Create issue

The draft format, commands and creation script come from the skill for the project's tracker, such as [github](../github/SKILL.md). Issue kinds, labels and milestones come from the project.

## Rules

- Lead with the problem in this repository and its evidence.
- Link code at a commit, never a branch.
- How another project handles the same thing may be cited as fact, never as the reason. Do not frame the work as copying it, or as an audit's output.
- A bug states the correct behaviour as a [Gherkin scenario](../gherkin/SKILL.md#a-bugs-scenario), which fails today. Its acceptance is the regression test that implements it.
- The issue stands alone: no local or gitignored paths, no internal ids such as audit keys.

## References

| Task                                                 | Read                                             |
| ---------------------------------------------------- | ------------------------------------------------ |
| Plan a change as a tracking issue with ordered steps | [references/programs.md](references/programs.md) |

## Flow

1. Search for a duplicate, open or closed.
2. Draft each issue in the tracker skill's format, using the project's closest kind: a bug, a task, or a decision for a question a maintainer must answer first.
3. Validate and show the user what would be created. Create only after they approve.
