---
name: second-opinion
description: A read-only review of a finished change by a model of another family, in at most two rounds, through another agent CLI or a subagent on another model. Use for a second opinion, a cross-model review of a diff, a review by another model or agent, or as final-review's last step.
allowed-tools: Bash(node --experimental-strip-types *run-review.mts *)
---

# Second opinion

A model from another family reviews the change after you have reviewed it yourself. It catches what the authoring model is blind to. It is a pragmatic second opinion, not an opponent: a clean result is a good result, and the reviewer is told it does not have to find anything. The reviewer follows [references/brief.md](references/brief.md).

## Configure

One variable, in the repository's `.env` or the environment: reviewers as `harness:model[@effort]`, in order of preference. The script picks the first one whose model family differs from yours, so one list serves every harness you work in.

```sh
# Grok reviews Claude and GPT; Sol, at low effort, reviews Grok.
SECOND_OPINION_REVIEWERS=cursor:grok-4.7-high,codex:gpt-6.1-sol@low

# From Claude Code, Sol reviews; from Codex, Opus does.
SECOND_OPINION_REVIEWERS=codex:gpt-6.1-sol,claude:opus

# OpenCode reaches several providers: Kimi reviews Claude and GPT; GPT reviews Kimi.
SECOND_OPINION_REVIEWERS=opencode:opencode-go/kimi-k3,opencode:github-copilot/gpt-6.1-sol
```

- **Family, not harness.** Cursor and OpenCode also run Claude and GPT models, and the review is only worth it from a model the author's blind spots do not share. The family comes from the id, after any `provider/`: `claude` for Claude ids and `opus`, `sonnet`, `fable` and `haiku`; `gpt` for `gpt`, `codex` and `o<n>`; otherwise the first word, such as `grok`.
- **Effort is a suffix, not a model.** Write `gpt-6.1-sol@low`, not an invented `gpt-6.1-sol-light`. The suffix is one of `minimal`, `low`, `medium`, `high`, `xhigh` or `max`, and becomes the harness's own option in the table below.
- **Exact ids, never fast.** A bare alias can resolve to a fast variant: in Cursor, `grok-4.7` means the account's default, such as `grok-4.7-high-fast`. The script refuses an id containing `fast`, except `[fast=false]`, and switches off Claude Code's fast mode, so Claude Code's aliases are safe.
- **Ids are not checked.** They change often and differ per account, so a wrong id fails in the reviewer's CLI. List the current ones with the command in the table.
- **Login, with a key as fallback.** Each CLI uses its own login. When the agent cannot reach it, as in CI or a sandbox, set `SECOND_OPINION_CLAUDE_API_KEY`, `SECOND_OPINION_CODEX_API_KEY` or `SECOND_OPINION_CURSOR_API_KEY`. The script passes it to the reviewer only, as `ANTHROPIC_API_KEY`, `CODEX_API_KEY` or `CURSOR_API_KEY`, so the coding agent's own key is left alone. OpenCode keeps a key per provider, set with `opencode auth login`.

| Harness    | Runs headless and read-only as                                  | `@effort` becomes                                                      | Current ids                                    |
| ---------- | --------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------- |
| `claude`   | `claude -p --permission-mode dontAsk`, only Read, Grep and Glob | `--effort`                                                             | `claude --help`, under `--model`               |
| `codex`    | `codex exec --sandbox read-only`                                | `-c model_reasoning_effort=`                                           | the model picker in `codex`, or the Codex docs |
| `cursor`   | `cursor-agent -p --mode ask`                                    | refused: the id names it, as in `grok-4.7-high` or `model[effort=low]` | `cursor-agent --list-models`                   |
| `opencode` | `opencode run --agent plan`                                     | `--variant`, per provider                                              | `opencode models`                              |

## Script

```sh
node --experimental-strip-types <this skill's folder>/scripts/run-review.mts --base <ref> --notes <file> --self <your model id> [--round 1|2]
```

The coding agent runs this itself; the user never has to. Run it from inside the repository, in the background: a review takes minutes. `<ref>` is the base the change targets, such as `origin/<integration branch>`, or, for a stacked PR, the branch below it. `--self` is the model you run on. The script sends the brief, the round, your notes, the diff from the merge base to the working tree, and the paths of untracked files, then prints the reviewer's findings.

- Exit code 2 means no listed reviewer is from another family. The script has written the prompt to a file and printed its path. Start a fresh, read-only subagent, not one that inherits your conversation, on a model you pick this way, and tell it to follow the prompt in that file; its reply is the review:
    - not the one you are running on, and from a different family when your harness offers one;
    - not the harness's most expensive frontier model, such as Fable in Claude Code or Astra in Codex. In Claude Code, Opus and Sonnet review each other: on Opus, use Sonnet. In Codex, Sol and Luna do;
    - never a fast variant.

    When your harness's subagents cannot pick a model, run the script again with `--harness <claude|codex|cursor|opencode> --model <id>` in place of `--self`, using an exact id outside Claude Code. Skip the review, and say so in one line, only when neither works.

- These rules are only for a model you pick. A listed reviewer runs as set, whatever its tier.
- Invoke this skill by name rather than only reading this file. Its `allowed-tools` pre-approves the command above, so a harness that blocks one agent from starting another lets it run. A harness that ignores `allowed-tools` needs the same rule in its own settings.
- A change too large for one prompt fails with a message. Review it in parts with a nearer `--base`.

## Flow

There are at most two rounds per change. The script refuses a third.

1. **Review it yourself first**, with [final-review](../final-review/SKILL.md) or the project's own gate. The checks must be green.
2. **Round 1.** Write notes to a scratch file outside the repository: what your review found, what you fixed, and what you deliberately left, with a reason for each. The reviewer treats those points as settled. Run `--round 1`.
3. **Show the review.** As soon as the review returns, show the user the reviewer's output in full, unedited, before acting on it. Show every round, including one that finds nothing.
4. **Verify each finding** against the code: reproduce the scenario or trace it through. The other model is a reviewer, not an authority. Fix the findings that hold and are `easy`, then run the checks again. Reject the ones that do not hold, with a one-line reason.
5. **Round 2, only if round 1 led to a code change.** Write new notes that list each round 1 finding with what you did: fixed at `file:line`, or rejected and why. Run `--round 2`. The reviewer checks only those fixes and what they touch. It does not look for new issues.
6. **Stop.** Do not ask again because you disagree with a result or because round 2 raised something. Verify what round 2 reports, fix what is `easy` and holds, and list the rest as open findings for the user to decide.
7. **Clean up.** Delete your notes and every prompt file the script wrote: each prompt file holds the full diff, and nothing else removes it.
