---
name: debug
description: Find and fix a bug at its root cause. Use for a failing test, a crash, an error, wrong output, a regression or flaky behaviour; before changing code to make a symptom go away.
---

# Debug

No fix before the cause is proven.

## Rules

- **Redact secrets** before pasting any output.
- **Stop and ask** when three fixes have failed (the design is suspect), or something is not understood.

## Flow

1. **Read the whole error,** stack trace included, before touching code.
2. **Build a loop that goes red:** one fast, deterministic command that shows the user's exact symptom, on the surface where it happens. Run it once. A pass on another surface proves nothing. If you cannot build one, say what you tried and ask.
3. **Shrink it** until every remaining part matters. For a regression, `git bisect run` the loop.
4. **Hypothesise.** Rank three to five, each falsifiable: "if X is the cause, changing Y removes the bug". Change one thing at a time.
5. **Prove it by running code.** Log at component boundaries, each line tagged `[DEBUG-<id>]` so cleanup is one grep. Suspect the observation before the system when results surprise you. A bug that vanishes on restart is state, not code.
6. **Fix where it starts,** tracing the bad value back to its source. Grep for the same pattern and fix every instance. No guard that only silences the symptom, and no sleep or retry that hides a race: wait on the actual condition.
7. **Regression test first** ([testing](../testing/SKILL.md)), from the bug's [scenario](../gherkin/SKILL.md#a-bugs-scenario) when it has one. Revert the fix and see it fail, restore it and see it pass. If no clean seam exists, that is the finding.
8. **Verify:** re-run the original loop, the debug-tag grep comes back empty, and the commit or PR states the proven cause.
