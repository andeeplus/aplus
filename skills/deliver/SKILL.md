---
name: deliver
description: Take an idea, a ticket or a program of issues to pull requests ready to merge, through triage or define, a review of any issue drafts, then the build, the ship gate and the PR or PR stack for each issue. Use to deliver or implement a ticket, issue, idea, feature or program end to end.
---

# Deliver

Automatic from spec to PR, every gate included. It waits for the user only to review the drafts [Drafts](#drafts) names, before a dangerous action, and, when a board exists, for the host skill's one-time board question.

## Rules

- **Ask before creating issues.** Show the drafts, delete the ones the user rejects, and create the rest.
- **Ask before a dangerous action:** one that is hard to undo or reaches past the change, such as merging, force-pushing, deleting a branch or data, a migration that could break a running system or lose data, a deploy, or changing repository or CI settings. The remove script keeps the branch, so running it needs no ask.
- **Ask for nothing else.** Asking to deliver approves each push, PR and PR body edit, and answers the waits in triage, final-review and create-pr. Resolve a target, merge method or branch name from the project and the host skill. When a board exists, ask that skill's one-time question, then move the issue as it says. Set in progress and assign the logged-in user before creating the branch or changing code. Do not set done: that waits for merge.
- **Park, don't stop.** When an issue cannot go on (a triage verdict other than `real bug` or `request`, work that already exists, an issue another agent already has in progress or in review, an open decision, a question from debug that blocks the fix, or a `not ready` verdict), record why, write a [handoff](../handoff/SKILL.md) note if it has a branch, run the remove script unless the caller keeps the worktree, skip the issues it blocks, and continue.
- **Build to the bar final-review applies** ([code-quality](../code-quality/SKILL.md)): the durable fix, inside the issue's scope, following the code around it. Work outside the scope becomes a draft.
- **Keep the drafts in one scratch folder** outside the tree, unless the caller names one.

## Drafts

A draft is an issue that does not exist yet, written with [create-issue](../create-issue/SKILL.md). A ticket on the tracker is that issue: after its spec, build it.

| When                                                 | Draft                                         |
| ---------------------------------------------------- | --------------------------------------------- |
| A ticket that stays one issue                        | none                                          |
| An idea, and the project needs an issue              | The spec's issue, or every issue of a program |
| Work that splits into a program                      | Each issue that does not exist yet            |
| Out-of-scope work, a deferred finding, or a decision | That issue                                    |

## Script

Removes the current linked worktree when the tree is clean and the branch is pushed or has a handoff note. It keeps the branch, the primary checkout, and a worktree a harness manages or that is locked. It prints `kept <reason>`, or `removed <path>` and `continue in <path>`: run every later command from that path.

```sh
node --experimental-strip-types <this skill's folder>/scripts/remove-worktree.mts
```

## Flow

1. **Start.** An issue with acceptance criteria, or a program of them, goes to step 3. A ticket without them goes to [triage](../triage/SKILL.md): a `real bug` goes to step 3, a `request` to define. An idea goes to [define](../define/SKILL.md).
2. **Review.** Ask define for the spec, and only the drafts [Drafts](#drafts) names. Define's review is the run's one review; create the drafts the user approves. When the spec adds acceptance a ticket lacks, publish that as an edit of the ticket.
3. **Run each issue** through steps 4 to 11, in "blocked by" order, without asking between them unless the user asked for pauses. In a program, run the claim, then hand the rest of that issue's pass to a fresh subagent briefed with the issue, its draft, the project instructions and that the claim is done, and keep only its output block here, so context stays small. A decision issue, and the work it blocks, waits for a maintainer. An issue too big to review as one PR, such as one sized `outcome`, ships as a stack: claim it once, then run the rest of the pass once per reviewable slice, each branch on the slice below ([stacks](../create-pr/references/stacks.md)).
4. **Claim.** Read the issue's status as the host skill's board says. Park it when it is already in progress or in review, unless you are resuming it from its branch or a handoff note. Otherwise set it in progress and assign the logged-in user, as that board says, before creating the branch or changing code.
5. **Branch** as [create-pr](../create-pr/SKILL.md) says.
6. **Build.**
    - A bug: its [Gherkin scenario](../gherkin/SKILL.md#a-bugs-scenario), in the PR body when the ticket has none, then [debug](../debug/SKILL.md).
    - A task: for each acceptance scenario, a test that fails first ([testing](../testing/SKILL.md)), then the code that makes it pass.
    - A refactor: the existing tests stay green; add one first where none covers the behaviour.
7. **Gate.** Run [final-review](../final-review/SKILL.md); it chooses its reviews. When the caller named a second-opinion harness and model, pass them on. Fix what fits the issue's scope, red checks included. Draft the rest with [create-issue](../create-issue/SKILL.md): a decision when the fix is unclear or a program of its own. Keep nits for the PR body. If you changed the branch, run final-review once more and draft any new out-of-scope finding. A drafted finding counts as logged, since the user reviews drafts at the end; when the verdict is still `not ready`, park the issue and include its drafts in the report.
8. **Commit** with [commit-expert](../commit-expert/SKILL.md).
9. **Open the PR** with create-pr. Name each deferred finding by title, and give the reviews that ran, with the reason for each skipped.
10. **Worktree.** Run the remove script, unless the caller keeps the worktree.
11. **Report** with the output below and every deferred draft. When the user answers, create the approved ones. When the issue opened a PR, link each from it and remove rejected ones from the PR body.

## Output

One block per issue, then the drafts awaiting review:

```
<issue or idea title>
Verdict: ready to ship | parked at <step>: <reason>
Reviews: all | <those that ran>; skipped: <reason>
PRs: <url, one per stack layer> | not opened
Drafts: <deferred findings drafted> | none
Left: <open decisions and nits, file:line> | none
```
