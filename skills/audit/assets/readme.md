---
scope: { scope-slug }
created: { YYYY-MM-DD }
author: { author-slug }
model: { model-name }
posture: { strict | balanced }
round: 00
---

# Audit: {scope-slug}

**Author:** {author-slug} · **Posture:** {posture} · **Verdict:** {one sentence}

## Files

| File           | Contents                                            |
| -------------- | --------------------------------------------------- |
| `bugs.md`      | Defects                                             |
| `program.md`   | Structural themes and their refactor moves (strict) |
| `notes.md`     | Patterns, and what must survive a refactor (strict) |
| `review-*.md`  | Further authors' reviews                            |
| `synthesis.md` | Where the authors agree and differ (cross-audit)    |
| `issues/`      | Issue drafts and `manifest.json`                    |

## TL;DR

{3 to 5 bullets}

## Priorities

{The order to fix things in, by key.}

## Open questions

{One bullet per question a maintainer must answer. Each becomes a decision issue.}

## Resources

{Every external package, doc or link consulted.}

## Cross-audit

{Omit this section unless several authors audited.}

| Author   | File                 | Verdict |
| -------- | -------------------- | ------- |
| {author} | `review-{author}.md` | …       |
