# Agent instructions

This repository is the aplus plugin: generic agent skills, plus a thin manifest for each tool that loads them.

## Layout

| Path                                                                       | Holds                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `skills/<name>/`                                                           | One folder per skill. Every tool reads this folder.                       |
| `.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, `.agents/plugins/` | Manifests and marketplaces. They only point at `skills/`; keep them thin. |

Inside a skill, progressive disclosure keeps what an agent loads small:

| Path              | Holds                                                                                                         | Loaded                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `SKILL.md`        | When to use the skill, its hard rules, and a table mapping each task to a reference or script. Keep it short. | When the skill triggers             |
| `references/*.md` | Detail for one task: formats, procedures, patterns                                                            | When the routing table points at it |
| `scripts/*`       | Deterministic steps: validation, creation, anything that must come out the same every time                    | Run, not read                       |
| `assets/*`        | Files to copy and fill in                                                                                     | When producing that file            |

## Rules for skills

- **Generic.** A skill names no project, command, branch or path. For those it defers to the project's `AGENTS.md` and the project skill it names.
- **Script it.** If two agents could do a step differently, write a script and make `SKILL.md` say to run it. Never reimplement a script's job by hand.
- **Schemas live in the project.** Issue forms, labels and the pull request template are in the project's `.github/`. Skills read them; they do not restate them.
- **Say what to do.** Describe the supported path. Do not describe an action a skill does not support, even to forbid it: naming it suggests it.
- **Link, don't copy.** Skills link to each other with relative paths, such as `../final-review/SKILL.md`.
- **Vendored files** keep their license beside them and a link to their source.

## Versions and changelog

- `version` is the same in `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json` and `.cursor-plugin/plugin.json`. It stays at 0.1.0 until the first set of skills is complete.
- After 0.1.0, every change a user notices gets one line in `CHANGELOG.md` under the next version, starting with the skill's name.
- An installed copy stays on its version until the version changes. To try unreleased changes in Claude Code, load this folder for one session: `claude --plugin-dir <path to this repository>`.

## Commits

Conventional commits, `type(skill): outcome`, as the commit-expert skill describes. Prettier formats the repository (`.prettierrc.json`).
