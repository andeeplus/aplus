---
name: deliver
description: Take an idea, a ticket or a program of issues to pull requests ready to merge, through triage or define, one review of the issue drafts, then the build, the ship gate and the PR for each issue. Use to deliver or implement a ticket, issue, idea, feature or program end to end.
---

# Deliver

Automatic from spec to PR, every gate included. It waits for the user only to review issue drafts and before a dangerous action.

**Project specifics** (the integration branch, check commands, whether work needs an issue) come from the project's `AGENTS.md` and the project skill it names.

## Rules

- **Ask before creating issues.** Show the drafts, delete the ones the user rejects, and create the rest.
- **Ask before a dangerous action:** one that is hard to undo or reaches past the change, such as merging, force-pushing, deleting a branch or data, a migration that could break a running system or lose data, a deploy, or changing repository or CI settings.
- **Ask for nothing else.** Asking to deliver approves each push, PR and PR body edit, and answers the waits in triage, final-review and create-pr.
- **Park, don't stop.** When an issue cannot go on (a triage verdict other than `real bug` or `request`, work that already exists, an open decision, a stop from debug, or `not ready` after the second gate), record why, write a [handoff](../handoff/SKILL.md) note if it has a branch, skip the issues it blocks, and continue.
- **Build to the bar final-review applies** ([code-quality](../code-quality/SKILL.md)): the durable fix, inside the issue's scope, following the code around it. Work outside the scope becomes a draft.
- **Keep the drafts in one scratch folder** outside the tree, unless the caller names one.

## Flow

1. **Start.** A ticket goes to [triage](../triage/SKILL.md): a `real bug` goes to step 3, a `request` to define. An idea goes to [define](../define/SKILL.md). An issue with acceptance criteria, or a program of them, goes to step 3.
2. **Review.** Ask define for the drafts with the spec: the spec's issue when the project needs one, every issue of a program, and the ticket edit for a ticket. Define's review is the run's one review; create the issues and publish the edit the user approves.
3. **Run each issue** through steps 4 to 8, in "blocked by" order, without asking between them unless the user asked for pauses. A decision issue, and the work it blocks, waits for a maintainer.
4. **Branch** as [create-pr](../create-pr/SKILL.md) says.
5. **Build.**
    - A bug: its [Gherkin scenario](../gherkin/SKILL.md#a-bugs-scenario), in the PR body when the ticket has none, then [debug](../debug/SKILL.md).
    - A task: for each acceptance scenario, a test that fails first ([testing](../testing/SKILL.md)), then the code that makes it pass.
    - A refactor: the existing tests stay green; add one first where none covers the behaviour.
6. **Gate.** Run [final-review](../final-review/SKILL.md). Fix what fits the issue's scope, red checks included. Draft the rest with [create-issue](../create-issue/SKILL.md): a decision when the fix is unclear or a program of its own. Keep nits for the PR body. If you changed the branch, run final-review once more and draft any new out-of-scope finding. A drafted finding counts as logged, since the user reviews drafts at the end; with anything else left, park.
7. **Commit** with [commit-expert](../commit-expert/SKILL.md).
8. **Open the PR** with create-pr, naming each deferred finding by title.
9. **Report** with the output below and every deferred draft. When the user answers, create the approved ones, link each from its PR, and remove rejected ones from the PR body.

## Output

One block per issue, then the drafts awaiting review:

```
<issue or idea title>
Verdict: ready to ship | parked at <step>: <reason>
PR: <url> | not opened
Drafts: <deferred findings drafted> | none
Left: <open decisions and nits, file:line> | none
```
