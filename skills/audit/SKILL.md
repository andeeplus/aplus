---
name: audit
description: Audit a codebase area's design and defects into local notes, file the findings as issues, and carry the refactor program to merged PRs. Use to audit an area, plan a refactor program, file issues from audit findings, execute an audit's issues, or add another author's review to an existing audit.
---

# Audit

**clarify → audit → issues (on request) → execute (on request) → hand off**

Use the project's domain terms (`CONTEXT.md` or its equivalent, when present). Issues on the project's tracker are the plan: the audit is local working notes, and anything that must outlive it becomes an issue.

## Rules

- **Correct over convenient.** Choose the long-term right fix. No workarounds, stubs, or docs that paper over a bad contract.
- **Push for truth.** Types, tests, runtime behaviour and docs must agree.

## Posture

| Posture            | Standard                                                                                                                                                                                                                 | Files                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| `strict` (default) | Apply [code-quality](../code-quality/SKILL.md) in full. It is written for a branch diff: treat the audited area as the change, and skip its rules about what a single PR adds, such as a file growing past a line limit. | All four               |
| `balanced`         | Real bugs and structural regressions only. Mention simplifications briefly, and push for a large refactor only when the path is obvious. Skip legibility nits.                                                           | `README.md`, `bugs.md` |

## Files

Artifacts go under `.audit/`. Check that it is gitignored; if it is not, ask before adding it to `.gitignore`.

```
.audit/{scope-slug}/{YYYY-MM-DD}/
  README.md                from assets/readme.md: verdict, priorities, open questions a maintainer must answer,
                           every external package, doc or link consulted, and links to the files below
  bugs.md                  one "## {bug-key}: title" per defect: problem, failure scenario, evidence
  program.md               one "## {theme-key}: title" per structural theme, with its refactor moves
                           under it as "### {move-key}: title" (strict)
  notes.md                 patterns the area follows or breaks, and what works and must survive a refactor (strict)
  review-{author-slug}.md  further authors' reviews
  synthesis.md             cross-audit only: where the authors agree and differ
  issues/                  issue drafts and manifest.json
```

- **Date folder:** the date the program's first audit started. Everything for that program, including other authors' reviews, drafts and later days' work, stays in it, so the drafts share one `manifest.json`.
- **Author slug:** kebab-case, such as `claude-opus`.
- **Keys** are short and stable (`B1`, `T2`, `M3`); issue drafts reuse them.

## Clarify

Ask the open questions in one round; skip what the request already answers.

| Topic       | Options                                              | Default                   |
| ----------- | ---------------------------------------------------- | ------------------------- |
| Scope       | A folder, package or subsystem                       | Inferred from the request |
| Posture     | `strict` or `balanced`                               | `strict`                  |
| Baseline    | The current tree, or a branch or commit              | The current tree          |
| Cross-audit | One author, or several models auditing independently | One author                |
| Issues      | Audit only, or also file issues                      | Audit only                |

Write nothing until scope and posture are confirmed.

## Audit

Create the files with [scripts/new-audit.mts](scripts/new-audit.mts), then fill them in. It writes the date folder, fills the templates in [assets/](assets/), and stops when `.audit/` is not gitignored. Never create them by hand.

```sh
node --experimental-strip-types <this skill's folder>/scripts/new-audit.mts <scope-slug> --author <author-slug> --model <model> [--posture strict|balanced]
node --experimental-strip-types <this skill's folder>/scripts/new-audit.mts <scope-slug> --author <author-slug> --model <model> --review
```

- **First run:** the command without `--review` writes the files for the posture.
- **Another author's review:** `--review` adds `review-{author-slug}.md`. Do not rewrite the first run's files.
- **Cross-audit:** the first author writes the full set. Each further author writes only `review-{author-slug}.md` from the same template, without reading the first author's files until their own findings are written. Once every author's file exists, write `synthesis.md` before drafting issues.

## Issues (on request)

1. Draft one file per issue in `issues/` with [create-issue](../create-issue/SKILL.md):

    | Source                            | Draft                             |
    | --------------------------------- | --------------------------------- |
    | Each `bugs.md` entry              | A bug                             |
    | Each `program.md` theme           | A tracking issue                  |
    | Each move under a theme           | A task with `parent: {theme-key}` |
    | Each open question in `README.md` | A decision                        |

    Use the closest form the project has for each kind. A balanced audit yields bugs and decisions only.

2. Create them as create-issue says: duplicate check, show the user, create only after they confirm.

## Execute (on request)

Run the program's open change issues with [deliver](../deliver/SKILL.md). Within an audit:

- Deliver's draft folder is the program's `issues/`, so its drafts share the `manifest.json`.
- A finding that is a program of its own stays a decision draft; propose an audit for it at hand off.
- Keep audit keys and `.audit/` paths out of branch names, titles and bodies.

## Hand off

The program is done when every change sub-issue is closed; the tracker may not close the tracking issue by itself. When it is done, the deliver run ends, or the user stops:

1. Summarize what shipped: PRs merged, issues closed, key outcomes.
2. List the open decisions and any spawned audits not yet started.
3. If the program is done, ask before closing its tracking issue.
4. Ask whether to continue with a spawned audit, work on a decision, or stop. Start nothing without confirmation.
