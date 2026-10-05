# @andeeplus/aplus

```text
▄████▄   ▄     ▄█████ ██ ▄█▀ ██ ██     ██     ▄█████
██▄▄██ ▄▄█▄▄   ▀▀▀▄▄▄ ████   ██ ██     ██     ▀▀▀▄▄▄
██  ██   █     █████▀ ██ ▀█▄ ██ ██████ ██████ █████▀
```

Agent skills for shipping changes with care: a ship gate before every commit or pull request, a second opinion from a different model, audits that become issues, stacked pull requests, and Gherkin scenarios for every bug. They work in Claude Code, Codex, Cursor, OpenCode and Pi.

## Install

### Claude Code

```
/plugin marketplace add andeeplus/aplus
/plugin install aplus@andeeplus
```

Send them as two separate prompts. The skills are then available as `aplus:<skill>`.

### Codex

```sh
codex plugin marketplace add andeeplus/aplus
codex plugin add aplus@andeeplus
```

### OpenCode

Add the plugin to `opencode.json`. OpenCode installs it from GitHub at startup.

```json
{ "plugin": ["github:andeeplus/aplus"] }
```

OpenCode 2 reads the same entry under `plugins`.

### Pi

```sh
pi install git:github.com/andeeplus/aplus
```

### Cursor

Cursor has no install command for a plugin from GitHub. Use one of these:

- **For yourself:** clone the repository into Cursor's local plugins folder, then run **Developer: Reload Window**. The skills appear under **Customize**. Pull the clone to update.

    ```sh
    git clone https://github.com/andeeplus/aplus ~/.cursor/plugins/local/aplus
    ```

    On Teams and Enterprise, an admin must turn on **Allow Local Plugin Imports**.

- **For a team** (Teams and Enterprise): in the Cursor dashboard, open **Plugins & MCPs**, select **Add Marketplace**, then **Import from Repo** with `https://github.com/andeeplus/aplus`.

## Use it in a project

The skills are generic: they never name a project's commands, branches or paths. They read those from the project:

| File                                                                                | Holds                                                                                                                   |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md` at the repository root                                                  | Coding rules, the integration branch, the merge method, issue and pull request policy                                   |
| A project skill that `AGENTS.md` names, such as `.agents/skills/<project>/SKILL.md` | A table pointing each need (checks, CI, test setup, release notes, issue forms) to the file that holds it               |
| `.github/`                                                                          | Issue forms, `labels.yml` and the pull request template. The github skill's `--init` installs default forms and labels. |

## A development flow

The skills chain into one flow. Each step names the skill that runs it, and each skill hands over to the next.

1. **Decide.** [triage](skills/triage/SKILL.md) checks a ticket is real, finds where it lives and recommends bug, misuse or request. [audit](skills/audit/SKILL.md) does the same for a whole area of code.
2. **Plan.** [create-issue](skills/create-issue/SKILL.md) turns the decision into an issue that stands alone, or an ordered program of them. [gherkin](skills/gherkin/SKILL.md) writes the expected behaviour as scenarios.
3. **Build.** [debug](skills/debug/SKILL.md) proves a bug's root cause with a failing loop. [testing](skills/testing/SKILL.md) picks the test layer and writes the test that fails first.
4. **Gate.** [final-review](skills/final-review/SKILL.md) runs the checks and three parallel reviews, fixes the easy findings once, then asks [second-opinion](skills/second-opinion/SKILL.md) for another model's view. It ends with `ready to ship` or `not ready`.
5. **Ship.** [commit-expert](skills/commit-expert/SKILL.md) writes the commits and release note. [create-pr](skills/create-pr/SKILL.md) opens one PR per issue, stacks dependent work, answers reviews and merges when asked.
6. **Pause.** [handoff](skills/handoff/SKILL.md) writes a note a fresh agent can resume from.

[github](skills/github/SKILL.md) and [atlassian](skills/atlassian/SKILL.md) run the host commands for steps 2 and 5.

## Skills

| Skill                                                              | Use                                                                                                      |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| [commit-expert](skills/commit-expert/SKILL.md)                     | Commit messages, PR titles, changelog lines and release notes; splitting work into commits               |
| [senior-technical-writer](skills/senior-technical-writer/SKILL.md) | Writing and reviewing docs against the code they describe                                                |
| [testing](skills/testing/SKILL.md)                                 | Choosing a test layer and writing tests that can fail                                                    |
| [gherkin](skills/gherkin/SKILL.md)                                 | Given/When/Then scenarios: every bug's expected behaviour, acceptance criteria, Cucumber feature files   |
| [second-opinion](skills/second-opinion/SKILL.md)                   | A different agent and model reviews a finished change, read-only, in at most two rounds                  |
| [final-review](skills/final-review/SKILL.md)                       | Ship gate: checks, three parallel reviews, one fix round, a second opinion, a ready or not-ready verdict |
| [create-issue](skills/create-issue/SKILL.md)                       | Issues that stand alone: duplicate check, problem and evidence first, programs of ordered issues         |
| [create-pr](skills/create-pr/SKILL.md)                             | Open pull requests: one per issue, dependent work stacked, reviews answered, merged only when asked      |
| [atlassian](skills/atlassian/SKILL.md)                             | Bitbucket pull requests and pipelines, Jira issues, Confluence pages, through atlassian-cli              |
| [github](skills/github/SKILL.md)                                   | Issues from validated draft files, pull requests and stacks with gh-stack, checks and reviews through gh |
| [audit](skills/audit/SKILL.md)                                     | Audit an area into local notes, turn findings into issues, carry them through to merged PRs              |
| [triage](skills/triage/SKILL.md)                                   | Decide what to do with a ticket: is it real, where does it live, bug, misuse or request                  |
| [debug](skills/debug/SKILL.md)                                     | Find a bug's root cause with a loop that fails, then fix it behind a regression test                     |
| [handoff](skills/handoff/SKILL.md)                                 | Pause work into a note a fresh agent can resume from                                                     |
| [code-quality](skills/code-quality/SKILL.md)                       | Strict maintainability check of the current branch's changes; final-review's code-quality reviewer       |

## Versions

Merging a change with a changeset to `main` opens or updates a release PR; merging that PR tags the version. [CHANGELOG.md](CHANGELOG.md) records what changes in each release.

## License

[MIT](LICENSE). Vendored files keep their own license beside them.
