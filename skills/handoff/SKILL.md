---
name: handoff
description: Pause work so a fresh agent can resume it, and pick up a paused task. Use when asked to hand off, pause, save progress, or continue from a handoff note; or before stopping with unfinished work.
---

# Handoff

The note is a contract: the next agent trusts it, so mark what you only assumed.

## Script

Prints the current branch's note path and creates its folder: `handoffs/<branch>.md` under the audit dir, the first entry of `APLUS_AUDIT_DIRS` (environment or `.env`, default `.audit`), resolved from the primary checkout so every worktree shares it. `--branch <name>` names another branch; `--list` prints each branch with a note and its path. It stops when the dir is inside the repository and not gitignored: ask the user before adding it to `.gitignore`.

```sh
node --experimental-strip-types <this skill's folder>/scripts/handoff-note.mts [--branch <name>] [--list]
```

## Pause

1. Finish or back out the current step. Stop running agents and dev servers, and list any that stay up.
2. Commit unfinished edits as one `wip:` commit, saying in its body if the tree is broken. Push nothing and open no PR you did not already have.
3. Write the note from [assets/handoff.md](assets/handoff.md) to the path the script prints.
4. Link what already lives elsewhere (issue, PR, docs) instead of copying it. Keep secrets and local paths out of anything published.

## Pick up

1. Find the note with the script (`--list` when the branch is unknown). Confirm the branch and HEAD match it, then read `git log` and the diff against the base.
2. Re-run the note's loop command. Treat "verified" claims as unproven until it agrees, and trust `git log` over the note.
3. Continue from the next action. Delete the note once resumed.
