# Agent instructions

This repository is the aplus plugin: generic agent skills, plus a thin manifest for each tool that loads them.

## Layout

| Path                                                                                        | Holds                                                                     |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `skills/<name>/`                                                                            | One folder per skill. Every tool reads this folder.                       |
| `.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, `.agents/plugins/`                  | Manifests and marketplaces. They only point at `skills/`; keep them thin. |
| `.opencode/plugins/index.js` (the `main` of `package.json`), the `pi` key in `package.json` | The OpenCode plugin and the Pi package. They only register `skills/`.     |

Inside a skill, progressive disclosure keeps what an agent loads small:

| Path              | Holds                                                                                                         | Loaded                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `SKILL.md`        | When to use the skill, its hard rules, and a table mapping each task to a reference or script. Keep it short. | When the skill triggers             |
| `references/*.md` | Detail for one task: formats, procedures, patterns                                                            | When the routing table points at it |
| `scripts/*`       | Deterministic steps: validation, creation, anything that must come out the same every time                    | Run, not read                       |
| `assets/*`        | Files to copy and fill in                                                                                     | When producing that file            |

## Rules for skills

- **Concise.** Say each thing once, in as few words as it needs. Keep `SKILL.md` to the core flow and a routing table, with detail in references, where that split helps. Be pragmatic about size: a longer skill that reads best as one file stays one file.
- **Generic.** A skill names no project, command, branch or path. For those it defers to the project's `AGENTS.md` and the project skill it names. A workflow skill names no host or tracker either: it defers to the platform skill, such as `github`.
- **Script it.** If two agents could do a step differently, write a script and make `SKILL.md` say to run it. Never reimplement a script's job by hand.
- **Schemas live in the project.** Issue forms, labels and the pull request template are in the project's `.github/`. Skills read them; they do not restate them.
- **Current only.** Skills, docs and commit messages describe what is supported now. Leave out what was renamed, replaced, deprecated or removed, and its old names.
- **Say what to do.** Describe the supported path. Do not describe an action a skill does not support, even to forbid it: naming it suggests it.
- **Link, don't copy.** Skills link to each other with relative paths, such as `../final-review/SKILL.md`.
- **Vendored files** keep their license beside them and a link to their source.

## Shape of a `SKILL.md`

An agent reads top to bottom and acts early, so a skill puts each part before the step that needs it. Every skill uses this order and omits the sections it does not need. Vendored skills keep their source's shape. `pnpm check` enforces the description and the heading order.

1. **`description`:** what the skill does, then a sentence starting `Use` that lists the words a user types for it. It is all a harness reads to decide whether to load the skill: keep the trigger words.
2. **`# Title`**, then one line: the contract, or the stance the skill takes. A skill with a long flow adds it as one line, such as `clarify → audit → ship`.
3. **Project line**, when the skill depends on the project: "**Project specifics** (_what_) come from the project's `AGENTS.md` and the project skill it names."
4. **`## Rules`:** bullets that start with a bold imperative.
5. **`## References`:** a `Task | Read` table, one row per reference.
6. **Domain sections,** named by noun, such as `Format` or `Posture`: the knowledge the skill applies.
7. **`## Script`:** the command, run as written, and what it does.
8. **`## Flow`:** numbered steps, one action each, led by a verb. A skill with several flows names each by its verb, such as `Pause` and `Pick up`, and puts no `## Flow` heading.
9. **`## Output`:** the exact shape of what the skill returns.

## Vocabulary

One word per concept, in every skill and reference. Skills ship without this file, so a skill still says what a term means where it first uses it, such as "scratch files outside the tree".

| Word                   | Means                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------ |
| **publish**            | Any action others see: push, open or edit a PR or issue, comment, transition, merge. |
| **host**, **tracker**  | Where code and PRs live; where issues live.                                          |
| **project skill**      | The skill the project's `AGENTS.md` names.                                           |
| **integration branch** | The branch PRs target.                                                               |
| **gate**, **verdict**  | A check that must pass; its one-line result.                                         |
| **finding**            | A review result, classed `easy`, `nit` or `rework`.                                  |
| **draft**              | An issue as a file, before it is created.                                            |
| **scratch file**       | A file outside the tree, never committed.                                            |
| **loop**               | The one command that reproduces a symptom.                                           |

## Versions and changelog

- Changesets owns the version. It stays at 0.1.0, with no changesets, until the first set of skills is complete. Then run `pnpm changeset tag` and `git push --follow-tags` to tag `v0.1.0`.
- After that, every change a user notices adds a changeset in `.changeset/`, written by hand as the commit-expert skill describes. Every changeset is a `patch` for now. Its summary starts with the skill's name, such as `triage: ask for a reproduction before labelling`.
- To release:
    1. `pnpm changeset:version` bumps `package.json`, writes `CHANGELOG.md`, and copies the version into the three plugin manifests. `pnpm check` fails when a manifest's version differs from `package.json`.
    2. Commit the result as `chore: release v<version>`.
    3. `pnpm changeset tag` tags the commit `v<version>`, and `git push --follow-tags` publishes the commit and the tag.
- An installed copy stays on its version until the version changes. To try unreleased changes in Claude Code, load this folder for one session: `claude --plugin-dir <path to this repository>`.

## Commits

Conventional commits, `type(skill): outcome`, as the commit-expert skill describes. Prettier formats the repository (`.prettierrc.json`).
