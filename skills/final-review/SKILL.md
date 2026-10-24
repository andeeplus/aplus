---
name: final-review
description: Ship gate for a finished change. It runs the project's checks, then the reviews the change needs, from tests, code quality, docs and a second opinion, and ends ready to ship or not ready. Use for a final review, to run the gates, to ask whether work is ready to ship, or before a commit or PR. Asking ready to ship is a verdict, not a request for every review.
---

# Final review

The last gate before a commit or pull request. Run it end to end without asking; the user reads one verdict.

## Change

The change under review is all three of the commands below, each ending in `"${LOCKS[@]}"` so lockfiles, which a package manager writes, stay out of every diff and list. Drop it only when the user asks for lockfiles.

```sh
LOCKS=(':(exclude,glob)**/*.lock' ':(exclude,glob)**/*.lockb' ':(exclude,glob)**/*.lockfile' ':(exclude,glob)**/*-lock.json' ':(exclude,glob)**/*-lock.yaml' ':(exclude,glob)**/*-lock.yml' ':(exclude,glob)**/packages.lock.json' ':(exclude,glob)**/npm-shrinkwrap.json' ':(exclude,glob)**/go.sum')
git diff origin/<base>...HEAD -- . "${LOCKS[@]}"
git diff HEAD -- . "${LOCKS[@]}"
git ls-files --others --exclude-standard -- . "${LOCKS[@]}"
```

- the branch diff against its base: run `git fetch` first. The base is the project's integration branch, or, for a stacked PR, the branch below it;
- uncommitted changes;
- untracked files, which skip gitignored ones.

## Reviews

The checks always run. After them, run the reviews the change needs, and skip the rest. Read the change and decide, as a senior reviewer would: spend a review where it can find something.

| Review           | Worth running when the change                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tests`          | adds or changes behaviour, or a test; skip for a typo, a comment or a rename the existing tests cover                                                              |
| `quality`        | adds or moves logic, a branch, an abstraction or a module; skip for a one-line or mechanical change                                                                |
| `docs`           | changes a contract, an option, a command, user-visible text, or a folder that has a README; skip when nothing a reader sees moved                                  |
| `second-opinion` | alters a public contract, a schema or a config format, touches security, persistent data, concurrency or boundary errors, or needed a design choice while building |

`facts` reports the change's size as advice. A large change rarely skips a review; a small one often skips most. Skip a review this conversation already did.

Asking whether work is ready to ship, or to run the gate before a commit or PR, asks for a verdict. It does not ask for every review. Run all four only when the user (or caller) names every review, all four, or the full set.

A skipped review needs a one-line reason a reader can check, such as `rename of a private helper; its tests cover it`. One reason covers the reviews skipped together.

## Script

```sh
node --experimental-strip-types <this skill's folder>/scripts/gate.mts facts --base <ref>
node --experimental-strip-types <this skill's folder>/scripts/gate.mts read --base <ref> [--all]
node --experimental-strip-types <this skill's folder>/scripts/gate.mts write --base <ref> --verdict "<ready to ship|not ready>" --reviews <all|none|list> [--reason "<one line>"]
```

`<ref>` is the base from Change. The stamp is the verdict for this exact change, kept outside the tree and shared by every worktree. `list` is names from the Reviews table, separated by commas.

- **facts** prints the files and lines changed, and `small: yes`, or `small: no` with what makes it more: over 4 files or 60 lines, a new source file, a binary, a copy, or a move across directories. A new test or doc stays small.
- **read** prints the stamped verdict, the reviews that ran and the reason, and exits 1 when the change differs from the one stamped. With `--all`, a stamp that skipped a review does not count.
- **write** stamps the verdict and the reviews that ran. It refuses to skip a review without `--reason`.

## Flow

Every verdict is stamped with `write` before the run ends.

1. **Stamp.** After the fetch, run `read`, with `--all` only when the caller or the user asked for every review. When it exits 0, its verdict is the result: report it, with the reviews and the reason, and stop.
2. **Checks.** Read project instructions, build and test scripts, and CI configuration to identify the required checks. Run the project's local gate: lint, typecheck and tests (its pre-commit or fast CI gate, where it has one). Also run any slower suite, such as end-to-end tests or a drift check, whose area the change touches, as the project's docs describe. A red result means `not ready`: go to step 8. Do not format by hand; format-on-save and the hooks own formatting.
3. **Choose.** Run `facts`, then pick the reviews as Reviews says. With none picked, write the release note the project requires, if it is missing, with [commit-expert](../commit-expert/SKILL.md#release-notes), and go to step 8.
4. **Review in parallel.** In one message, launch a read-only subagent for each chosen review among tests, quality and docs. Each prompt contains the base ref and the scope's commands from Change, not a diff: the reviewer runs them and reads the changed files in the repository. It also contains the absolute path of the skill file to apply (resolve the links below against this skill's folder), and the return format below. Pass the path because a subagent cannot invoke a skill by name.

    | Review    | Apply                                                          | Also checks                                                                                                                                                                                                              |
    | --------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
    | `tests`   | [testing](../testing/SKILL.md)                                 |                                                                                                                                                                                                                          |
    | `quality` | [code-quality](../code-quality/SKILL.md)                       |                                                                                                                                                                                                                          |
    | `docs`    | [senior-technical-writer](../senior-technical-writer/SKILL.md) | The project's comment conventions. Where a folder whose behaviour changed has a README, it and any index that lists it are updated. A user-facing change has the release note the project requires, such as a changeset. |

    Each reviewer returns a list of findings with `file`, `line`, `summary` and `class`:

    - `easy`: a fix inside the change that needs no design decision. Quick nits and a missing release note count.
    - `nit`: real, but not quick.
    - `rework`: touches files outside the change, needs a design decision, or changes behaviour.

5. **Fix once.** Apply every `easy` finding in one pass; write a missing release note with [commit-expert](../commit-expert/SKILL.md#release-notes). Do not commit.
6. **Re-check.** Run step 2 again, then re-run only the reviewers whose findings you fixed. There is no second fix round for these reviewers.
7. **Second model**, when chosen. With the checks green, invoke the [second-opinion](../second-opinion/SKILL.md) skill by name and run it on the same base, with notes on what steps 4 to 6 found, fixed and left. When the caller names a harness and model, pass them as `--harness` and `--model`. It runs at most three rounds and uses the same classes, and you verify each of its findings before acting on it. When the caller defers it for a layer of a stack, skip it: the caller runs it once over the whole stack ([stacks](../create-pr/references/stacks.md)).
8. **Verdict.** Stamp it with the reviews that ran, then end with exactly one of:

    - `ready to ship`: every check is green, no `easy` finding is left, and every `rework` finding is fixed or logged.
    - `not ready`: anything else.

    A deferred `rework` finding is logged when its issue exists and the user agreed to defer it, or when the calling workflow has drafted it for the user to review after the PR opens.

    After the verdict, name the reviews that ran, and the reason for each one skipped. Then list what is left with `file:line` and the reason, including findings from step 7: rework first, then nits. Nits never block. Do not start rework unless asked.
