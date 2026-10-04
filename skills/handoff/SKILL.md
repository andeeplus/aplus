---
name: handoff
description: Pause work so a fresh agent can resume it, and pick up a paused task. Use when asked to hand off, pause, save progress, or continue from a handoff note; or before stopping with unfinished work.
---

# Handoff

The note is a contract: the next agent trusts it, so mark what you only assumed.

## Pause

1. Finish or back out the current step. Stop running agents and dev servers, and list any that stay up.
2. Commit unfinished edits as one `wip:` commit, saying in its body if the tree is broken. Push nothing and open no PR you did not already have.
3. Write the note from [assets/handoff.md](assets/handoff.md) to `$(git rev-parse --git-common-dir)/handoff/<branch>.md`: outside the tree, shared by every worktree, never committed.
4. Link what already lives elsewhere (issue, PR, docs) instead of copying it. Keep secrets and local paths out of anything published.

## Pick up

1. Confirm the branch and HEAD match the note, then read `git log` and the diff against the base.
2. Re-run the note's loop command. Treat "verified" claims as unproven until it agrees, and trust `git log` over the note.
3. Continue from the next action. Delete the note once resumed.
