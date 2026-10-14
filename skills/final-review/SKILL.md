---
name: final-review
description: Ship gate for a finished change, with the project's checks, three parallel reviews, one fix round, a second opinion, and a verdict of ready to ship or not ready. Use for a final review, to run the gates, to ask whether work is ready to ship, or before a commit or PR.
---

# Final review

The last gate before a commit or pull request. Run it end to end without asking; the user reads one verdict.

## Scope

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

## Flow

1. **Checks.** Read project instructions, build and test scripts, and CI configuration to identify the required checks. Run the project's local gate: lint, typecheck and tests (its pre-commit or fast CI gate, where it has one). Also run any slower suite, such as end-to-end tests or a drift check, whose area the change touches, as the project's docs describe. A red result means `not ready`: go to step 6. Do not format by hand; format-on-save and the hooks own formatting.

2. **Review in parallel.** In one message, launch three read-only subagents. Each prompt contains the base ref and the scope's commands, not a diff: the reviewer runs them and reads the changed files in the repository. It also contains the absolute path of the skill file to apply (resolve the links below against this skill's folder), and the return format below. Pass the path because a subagent cannot invoke a skill by name.

    | Reviewer     | Apply                                                          | Also checks                                                                                                                                                                                                              |
    | ------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
    | Tests        | [testing](../testing/SKILL.md)                                 |                                                                                                                                                                                                                          |
    | Code quality | [code-quality](../code-quality/SKILL.md)                       |                                                                                                                                                                                                                          |
    | Docs         | [senior-technical-writer](../senior-technical-writer/SKILL.md) | The project's comment conventions. Where a folder whose behaviour changed has a README, it and any index that lists it are updated. A user-facing change has the release note the project requires, such as a changeset. |

    Each reviewer returns a list of findings with `file`, `line`, `summary` and `class`:

    - `easy`: a fix inside the change that needs no design decision. Quick nits and a missing release note count.
    - `nit`: real, but not quick.
    - `rework`: touches files outside the change, needs a design decision, or changes behaviour.

3. **Fix once.** Apply every `easy` finding in one pass; write a missing release note with [commit-expert](../commit-expert/SKILL.md#release-notes). Do not commit.

4. **Re-check.** Run step 1 again, then re-run only the reviewers whose findings you fixed. There is no second fix round for these reviewers.

5. **Second model.** With the checks green, invoke the [second-opinion](../second-opinion/SKILL.md) skill by name and run it on the same base, with notes on what steps 2 to 4 found, fixed and left. It runs at most three rounds and uses the same classes, and you verify each of its findings before acting on it. When no listed reviewer is from another model family, it runs as a subagent on another model, as that skill says.

6. **Verdict.** End with exactly one of:

    - `ready to ship`: every check is green, no `easy` finding is left, and every `rework` finding is fixed or logged.
    - `not ready`: anything else.

    A deferred `rework` finding is logged when its issue exists and the user agreed to defer it, or when the calling workflow has drafted it for the user to review after the PR opens.

    After the verdict, list what is left with `file:line` and the reason, including findings from step 5: rework first, then nits. Nits never block. Do not start rework unless asked.
