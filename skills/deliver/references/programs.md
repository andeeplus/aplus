# Programs

A program runs in tracks. A track is a group of the program's issues that ships as one branch and one PR, with each issue as its own commits. It keeps every issue on the tracker while cutting the PRs, CI runs and reviews a program costs.

## Plan

- **Group by outcome.** One track per coherent change a reviewer reads in one sitting: issues that touch the same code or share a design, with each bug in the track of the change that fixes it.
- **Keep to three issues.** Split a larger track, or say in the plan why it stays whole; the check script flags each one over the limit.
- **Order by "blocked by".** Issues inside a track in build order; tracks in delivery order. A track whose blockers sit in an earlier track stacks on it.
- **Ask once.** Write the plan from [assets/tracks.md](../assets/tracks.md) beside the drafts, run the check script with `--expect` listing every open change issue of the program, and show the plan with the script's output and the gate question. The user confirms the plan or regroups, and picks the gate; a track of one issue is a PR of its own. Then run it without asking again.

## Gate

Ask with the plan, unless the user already named one:

- **Track gate** (default): final-review runs once, after the last issue's commits, over the whole branch. Brief the second opinion with the issues in commit order, each with its commit range, and ask each finding to name its issue.
- **Issue gates:** final-review runs after each issue's commits, with the commit before them as its base. It costs a review per issue; the track still opens one PR.

## Script

Checks a track plan: each issue in one place, no blocker later than the issue it blocks, and with `--expect` exactly the program's issues. It prints each track's base: `base` for the integration branch, or `stacks on <key>`, adding `waits for <keys>` for tracks with a blocker that must merge first. It flags a track `over the soft limit` and lists the blockers outside the plan, which must already be merged.

```sh
node --experimental-strip-types <deliver's folder>/scripts/check-tracks.mts <tracks.md> [--expect <ref>,<ref>...]
```

## Run

For each track, in plan order:

1. **Claim** each of its issues, as deliver's step 4 says.
2. **Hand off** the rest of the track's pass to a fresh subagent briefed with the track and its base, its issues, their drafts when they have them, the project instructions, the gate, and that the claims are done. Keep only its output block here, so context stays small.
3. **The subagent runs steps 5 to 11 once for the track:** one branch on the base the script printed, step 6 and its commits once per issue in order, the gate, and one PR that resolves every issue. Each issue's commits, fixes from the gate included, name only that issue in their `Refs:` footer.

A track that `waits for` other tracks parks until they merge.

## Park inside a track

When an issue cannot go on after its track started:

1. Move its commits, and those of every issue that builds on it, to a branch of its own from the track's base, with a [handoff](../../handoff/SKILL.md) note. An issue builds on it when it lists it as a blocker or its checks fail without it.
2. Run the project's checks on what stays. Move each issue whose checks now fail, and repeat until they pass.
3. When the gate already ran, run it again on what stays.
4. Open the PR for the issues that stay. The report names each moved issue, its branch and why.
