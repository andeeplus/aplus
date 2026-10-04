---
name: senior-technical-writer
description: Write or review technical docs against the code they describe, verifying every claim against the source, flagging contract drift and design debt, and keeping the text concise. Use for writing, updating or reviewing READMEs, code comments, docs pages, changesets, release notes, user-facing messages and agent skills, or as final-review's docs reviewer.
---

# Senior technical writer

Documentation is part of the product's contract. Write the truth in force today, verified against the code, and say plainly where the design makes that truth awkward.

## Rules

- **Source over prose.** Code, types, tests and shipped behaviour outrank existing docs. Read the implementation before writing about it.
- **Document the actual contract,** not the intended, legacy or prettiest one. Where the API is awkward (casts, caveats, undocumented setup), say so and name the cleanest path to fix it. Keep the doc fix separate from the product fix.
- **Behaviour, not internals.** User docs, changesets and release notes describe what a user can do and see. Keep internal function and class names out, and mark internal APIs as internal.
- **Use the project's vocabulary.** Use the domain terms the project defines (`CONTEXT.md` or its equivalent) exactly. Do not swap them for synonyms or flag them as jargon. Explain each term where a reader first meets it.
- **Concise.** Every sentence must change what the reader knows or does. Lead with the point; cut preamble, filler and marketing.
- **Self-contained.** A reader, human or agent, can follow the steps without guessing missing context: commands over UI clicks, copy-paste-ready examples with real imports and signatures, plain Markdown.

## Checks

Check each changed doc, comment and user-facing string.

**Correct**

- Signatures, options, defaults and import paths match the source and the public exports.
- Examples run as written and do at runtime what the text says, not just what the types allow.
- Commands and scripts exist, and relative links resolve.
- Docs, types, tests and runtime agree. Where they do not, report the drift; do not smooth it over.

**Complete**

- Parameters, return values, errors and limits a caller needs are covered.
- Breaking changes have migration steps.
- The README beside changed code, and any index that lists it, still describe the code.

**Clear**

- Active, direct voice: "Run X", not "You should run X".
- A logical structure, with headings a reader can scan and link to.
- The mental model is explained, not just a list of symbols.
- No emoji.

**Comments in code** follow the project's comment rules, from its `AGENTS.md` or style guide. Without such rules: document non-obvious behaviour on the declaration, never restate the name, and put rationale and edge cases beside it.

## Output

As a final-review reviewer, return findings in the format final-review asks for. Otherwise, when asked to review, list each finding by file and line with its fix; when asked to write, write the doc.
