---
name: debug
description: Find and fix a bug at its root cause. Use for a failing test, a crash, an error, wrong output, a regression or flaky behaviour; before changing code to make a symptom go away.
---

# Debug

No fix before the cause is proven.

## Rules

- **Redact secrets** before pasting any output.
- **Investigate uncertainty.** Test the next hypothesis when the evidence supports it. After three failed fixes, reassess the cause and design; ask when progress needs information or a decision you cannot establish yourself.

## Flow

1. **Read the whole error,** stack trace included, before touching code.
2. **Build a loop that goes red:** one fast, deterministic command that shows the user's exact symptom, on the surface where it happens. Run it once. A pass on another surface proves nothing. If you cannot build one, say what you tried and ask.
3. **Shrink it** while preserving the symptom. For a regression with an unknown introducing commit, use `git bisect run` when the loop can distinguish good and bad revisions.
4. **Hypothesise.** Rank plausible causes from the evidence, each falsifiable: "if X is the cause, changing Y removes the bug". Test the strongest one first, changing one thing at a time.
5. **Prove it by running code.** Add boundary logs when needed, tagged `[DEBUG-<id>]` for cleanup. Check the observation when results surprise you. If a restart removes the symptom, investigate the state and timing it resets; the cause remains unproven.
6. **Fix where it starts,** tracing the bad value to its source. Search for related instances, verify that they share the cause, fix those inside the task's scope, and report the rest. Choose the smallest durable fix using [code-quality's design rules](../code-quality/SKILL.md#dry-and-etc). Enforce the contract at the responsible boundary; synchronize races on the actual condition.
7. **Regression test first** ([testing](../testing/SKILL.md)), from the bug's [scenario](../gherkin/SKILL.md#a-bugs-scenario) when it has one. Revert the fix and see it fail, restore it and see it pass. If no clean seam exists, that is the finding.
8. **Verify:** re-run the original loop, the debug-tag grep comes back empty, and the commit or PR states the proven cause.
