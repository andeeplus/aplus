# Execute

Carry an audit's program to PRs, on request.

Run the program's open change issues with [deliver](../../deliver/SKILL.md) in tracks ([deliver: programs](../../deliver/references/programs.md)), one fresh subagent per track, one track at a time, all in one worktree. A subagent cannot ask the user, so settle the reviewer and the tracks first, in one round:

1. **Tracks.** Write `tracks.md` beside `issues/`, starting from one track per theme with the bugs its moves fix, and check and show it with the gate question, as deliver's programs reference says. Pass the chosen gate to each track's subagent.
2. **Reviewer.** When `APLUS_SECOND_OPINION_REVIEWERS`, in the environment or the repository's `.env`, lists no reviewer from a model family other than yours, ask once which harness (`claude`, `codex`, `cursor` or `opencode`) and exact model id run the [second opinion](../../second-opinion/SKILL.md). Offer to save the answer to `.env` as `APLUS_SECOND_OPINION_REVIEWERS=<harness>:<model>` when `.env` is gitignored, and write it only if the user agrees.
3. **Each track.** Start a subagent with the absolute paths of deliver's `SKILL.md` and its programs reference, the track with its base, each issue with its draft path and the `--excerpt` of the keys it was drafted from, the worktree path, and the reviewer from step 2. Tell it to skip deliver's worktree step and to return only deliver's output block. Keep the block and the drafts it names. The excerpt holds the steps and may change while building; each issue's acceptance is what must hold.
4. **Worktree.** At hand off, run deliver's [remove script](../../deliver/scripts/remove-worktree.mts) from the program worktree.

## Within an audit

- Deliver's draft folder is the program's `issues/`, so its drafts share the `manifest.json`.
- Claim the track's issues, as deliver does, before its subagent starts. Pass the subagent their draft paths and the audit entries their `audit` lists name, with the claims already done. Between tracks, this context holds the `manifest.json`, `tracks.md` and each track's output block.
- After the claim, and before the branch, match the issue to its draft in `issues/` (`manifest.json` maps each draft key to its issue) and read the audit entries that draft's `audit` list names. They are the steps, and may change while building; the issue's acceptance is what must hold.
- A finding that is a program of its own stays a decision draft; propose an audit for it at hand off.
- Keep audit keys and audit dir paths out of branch names, titles and bodies. Track keys stay local too.
