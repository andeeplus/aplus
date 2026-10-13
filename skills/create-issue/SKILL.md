---
name: create-issue
description: Write issues that stand on their own, on any tracker. Use to file a bug, task or decision, turn findings into issues, or plan a change as a tracking issue with ordered child issues.
---

# Create issue

The draft format, commands and creation script come from the skill for the project's tracker, such as [github](../github/SKILL.md). Issue kinds, labels and milestones come from the project.

## Rules

- Size issues as [Size](#size) says. Several issues that reach one goal in order are a [program](references/programs.md).
- Carry the intent, not the plan: why the change matters, the design it reaches, and how to tell it is done. The steps belong to whoever builds it.
- Lead with the problem in this repository and its evidence.
- Link code at a commit, never a branch.
- How another project handles the same thing may be cited as fact, never as the reason. Do not frame the work as copying it, or as an audit's output.
- A bug states the correct behaviour as a [Gherkin scenario](../gherkin/SKILL.md#a-bugs-scenario), which fails today. Its acceptance is the regression test that implements it.
- The issue stands alone: no local or gitignored paths, no internal ids such as audit keys.

## References

| Task                                                        | Read                                             |
| ----------------------------------------------------------- | ------------------------------------------------ |
| Plan a change as a tracking issue with ordered child issues | [references/programs.md](references/programs.md) |

## Size

The user picks how much one issue holds. Ask once, before drafting more than a few issues; the default is `pr`.

| Size      | One issue is                                                             | Ships as                    |
| --------- | ------------------------------------------------------------------------ | --------------------------- |
| `finding` | One defect or one change, the smallest that can ship alone               | One pull request            |
| `pr`      | What one reviewer takes as one pull request: one cause, category or seam | One pull request            |
| `outcome` | One outcome a reviewer can check, such as a theme's goal                 | One pull request or a stack |

At every size, group with judgement: keep together what cannot ship apart, and split an issue whose title needs two outcomes.

## Flow

1. Search for a duplicate, open or closed.
2. Draft each issue in the tracker skill's format, using the project's closest kind: a bug, a task, or a decision for a question a maintainer must answer first.
3. Validate and show the user what would be created. Create only after they approve, then follow the tracker skill's board.
