# Issues

File an audit's findings as issues, on request.

1. Draft one file per issue in `issues/` with [create-issue](../../create-issue/SKILL.md), at the issue size from Clarify:

    | Source                            | Draft                                                                                           |
    | --------------------------------- | ----------------------------------------------------------------------------------------------- |
    | `bugs.md` entries                 | Bugs, each `blockedBy` the task whose change is the right fix when the two stay separate issues |
    | Moves under a theme               | Tasks                                                                                           |
    | A theme larger than one issue     | A tracking issue, with its tasks as children                                                    |
    | Each open question in `README.md` | A decision                                                                                      |

    Use the closest form the project has for each kind. A balanced audit yields bugs and decisions only.

2. Link each draft to the audit with an `audit` list in its frontmatter, such as `audit: [T2, M2.1, M2.3]`. The issue script does not publish it. The body carries the intent from the audit: the problem with its evidence, the design the change reaches, and the acceptance. The audit keeps the steps.
3. Create them as create-issue says: duplicate check, show the user each draft with its `audit` keys, create only after they confirm.
