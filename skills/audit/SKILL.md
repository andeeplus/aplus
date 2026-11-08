---
name: audit
description: Audit a codebase area's design and defects into local notes, file the findings as issues, and carry the refactor program to merged PRs. Use to audit an area, plan a refactor program, file issues from audit findings, execute an audit's issues, or add another author's review to an existing audit.
---

# Audit

**clarify → audit → issues (on request) → execute (on request) → hand off**

Use the project's domain terms (`CONTEXT.md` or its equivalent, when present). The audit is local working notes. An issue on the project's tracker carries the intent of a change and outlives the audit; the audit entries it covers are the steps its builder reads. Anything that must outlive the audit becomes an issue.

## Rules

- **Correct over convenient.** Choose the long-term right fix. No workarounds, stubs, or docs that paper over a bad contract.
- **Push for truth.** Types, tests, runtime behaviour and docs must agree.
- **Sync after every change.** Each time you write, edit or create anything in the audit dir, including issue drafts, `manifest.json` and `tracks.md`, run `new-audit.mts --sync`. With no mirror it does nothing, so always run it.
- **Ask when the audit is missing.** An audit lives only in the audit dirs. Before reading one, run `new-audit.mts --find [scope-slug]`. When it exits 1, such as on a fresh clone or another machine, ask the user where the audit is, or whether to work from the tracker's issues alone. For the issues alone, take the tracker and project from the project's instructions, asking when they do not name them, then read the tracking issue and its children with the platform skill ([github](../github/SKILL.md) or [atlassian](../atlassian/SKILL.md)) and run [Execute](references/execute.md) with each issue's acceptance as the steps.

## References

| Task                                      | Read                                           |
| ----------------------------------------- | ---------------------------------------------- |
| File the findings as issues               | [references/issues.md](references/issues.md)   |
| Execute the program's issues with deliver | [references/execute.md](references/execute.md) |

## Posture

| Posture            | Standard                                                                                                                                                                                                                 | Files                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| `strict` (default) | Apply [code-quality](../code-quality/SKILL.md) in full. It is written for a branch diff: treat the audited area as the change, and skip its rules about what a single PR adds, such as a file growing past a line limit. | All four               |
| `balanced`         | Real bugs and structural regressions only. Mention simplifications briefly, and push for a large refactor only when the path is obvious. Skip legibility nits.                                                           | `README.md`, `bugs.md` |

## Files

Artifacts go under the audit dir. Check that it is gitignored when it is inside the repository; if it is not, ask before adding it to `.gitignore`.

- **`APLUS_AUDIT_DIRS`:** in the environment or the repository's `.env`, a list of dirs separated by commas. The first is where you work and defaults to `.audit`; the others are mirrors, such as a notes vault. `{project}` in an entry becomes the repository's name, so one value serves every project: `APLUS_AUDIT_DIRS=.audit,/Users/me/Vault/audits/{project}`.
- **Mirrors** only receive copies, from `--sync`, and never lose a file the working copy loses.

```
{audit dir}/{scope-slug}/{YYYY-MM-DD}/
  README.md                from assets/readme.md: verdict, priorities, open questions a maintainer must answer,
                           every external package, doc or link consulted, and links to the files below
  bugs.md                  one "## {bug-key}: title" per defect: problem, failure scenario, evidence
  program.md               one "## {theme-key}: title" per structural theme, with its refactor moves
                           under it as "### {move-key}: title" (strict)
  notes.md                 patterns the area follows or breaks, and what works and must survive a refactor (strict)
  review-{author-slug}.md  further authors' reviews
  synthesis.md             cross-audit only: where the authors agree and differ
  issues/                  issue drafts and manifest.json
  tracks.md                the track plan, when the program is executed
```

- **Date folder:** the date the program's first audit started. Everything for that program, including other authors' reviews, drafts and later days' work, stays in it, so the drafts share one `manifest.json`.
- **Author slug:** kebab-case, such as `claude-opus`.
- **Keys** are short and stable (`B1`, `T2`, and `M2.1` for a move under `T2`); each issue draft lists the ones it covers.

## Clarify

Ask the open questions in one round; skip what the request already answers.

| Topic       | Options                                                                            | Default                   |
| ----------- | ---------------------------------------------------------------------------------- | ------------------------- |
| Scope       | A folder, package or subsystem                                                     | Inferred from the request |
| Posture     | `strict` or `balanced`                                                             | `strict`                  |
| Baseline    | The current tree, or a branch or commit                                            | The current tree          |
| Cross-audit | One author, or several models auditing independently                               | One author                |
| Issues      | Audit only, or also file issues                                                    | Audit only                |
| Issue size  | `finding`, `pr` or `outcome` ([create-issue: size](../create-issue/SKILL.md#size)) | `pr`                      |

Write nothing until scope and posture are confirmed.

## Audit

Create the files with [scripts/new-audit.mts](scripts/new-audit.mts), then fill them in. It writes the date folder, fills the templates in [assets/](assets/), and stops when an audit dir inside the repository is not gitignored. Never create them by hand.

```sh
node --experimental-strip-types <this skill's folder>/scripts/new-audit.mts <scope-slug> --author <author-slug> --model <model> [--posture strict|balanced]
node --experimental-strip-types <this skill's folder>/scripts/new-audit.mts <scope-slug> --author <author-slug> --model <model> --review
node --experimental-strip-types <this skill's folder>/scripts/new-audit.mts --sync
node --experimental-strip-types <this skill's folder>/scripts/new-audit.mts --find [scope-slug]
node --experimental-strip-types <this skill's folder>/scripts/new-audit.mts --excerpt <date-folder> <key>...
```

- **First run:** the command without `--review` writes the files for the posture.
- **Another author's review:** `--review` adds `review-{author-slug}.md`. Do not rewrite the first run's files.
- **Sync:** `--sync` copies the working copy to every mirror. The first two commands sync on their own.
- **Find:** `--find` prints the audits in the working copy, or the one for a scope, and exits 1 when there are none.
- **Excerpt:** `--excerpt` prints the bug, theme or move for each key. A theme includes its moves. It exits 1 when a key has no section.
- **Cross-audit:** the first author writes the full set. Each further author writes only `review-{author-slug}.md` from the same template, without reading the first author's files until their own findings are written. Once every author's file exists, write `synthesis.md` before drafting issues.

## Hand off

The program is done when every change sub-issue is closed; the tracker may not close the tracking issue by itself. When it is done, the deliver run ends, or the user stops:

1. Summarize what shipped: PRs merged, issues closed, key outcomes.
2. List the open decisions and any spawned audits not yet started.
3. If the program is done, ask before closing its tracking issue.
4. Ask whether to continue with a spawned audit, work on a decision, or stop. Start nothing without confirmation.
