# aplus

Agent skills for shipping changes with care: a ship gate before every commit or pull request, a second opinion from a different model, audits that become GitHub issues, and stacked pull requests. They work in Claude Code, Codex and Cursor.

**Status:** 0.1.0, in progress. Skills are added one at a time.

## Install

### Claude Code

```
/plugin marketplace add andeeplus/aplus
/plugin install aplus@aplus
```

Send them as two separate prompts. The skills are then available as `aplus:<skill>`.

### Codex

```sh
codex plugin marketplace add andeeplus/aplus
codex plugin add aplus@aplus
```

### Cursor

`.cursor-plugin/plugin.json` describes the plugin. An install path for Cursor is not set up yet.

## Use it in a project

The skills are generic: they never name a project's commands, branches or paths. They read those from the project:

| File                                                                                | Holds                                                                                                     |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `AGENTS.md` at the repository root                                                  | Coding rules, the integration branch, the merge method, issue and pull request policy                     |
| A project skill that `AGENTS.md` names, such as `.agents/skills/<project>/SKILL.md` | A table pointing each need (checks, CI, test setup, release notes, issue forms) to the file that holds it |
| `.github/`                                                                          | Issue forms, `labels.yml` and the pull request template                                                   |

## Skills

| Skill                                                              | Use                                                                                                      |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| [commit-expert](skills/commit-expert/SKILL.md)                     | Commit messages, PR titles, changelog lines and release notes; splitting work into commits               |
| [senior-technical-writer](skills/senior-technical-writer/SKILL.md) | Writing and reviewing docs against the code they describe                                                |
| [testing](skills/testing/SKILL.md)                                 | Choosing a test layer and writing tests that can fail                                                    |
| [second-opinion](skills/second-opinion/SKILL.md)                   | A different agent and model reviews a finished change, read-only, in at most two rounds                  |
| [final-review](skills/final-review/SKILL.md)                       | Ship gate: checks, three parallel reviews, one fix round, a second opinion, a ready or not-ready verdict |
| [github-cli](skills/github-cli/SKILL.md)                           | Issues from validated draft files, pull requests and stacks with gh-stack, checks and reviews through gh |
| [audit](skills/audit/SKILL.md)                                     | Audit an area into local notes, turn findings into issues, carry them through to merged PRs              |

## Versions

The version stays at 0.1.0 until the first set of skills is complete. From then on, [CHANGELOG.md](CHANGELOG.md) records what changes in each release.

## License

[MIT](LICENSE). Vendored files keep their own license beside them.
