# Tickets from developers

A maintainer, a contributor or a teammate brings evidence and often a diagnosis: a stack trace, versions, a reproduction, a suspected cause or a patch.

- **Verify the diagnosis, do not adopt it.** Re-run their reproduction; check the suspected cause against the code. A proposed fix may treat a symptom.
- **Check the environment:** versions, runtime, configuration, and whether they are supported. An unsupported setup is a verdict, not a dead end: say what is supported.
- **Use their reproduction as the loop** for [debug](../../debug/SKILL.md) when the ticket becomes a fix. Shrink it if it carries more than the bug needs.
- **Look for the pattern.** The same mistake elsewhere in the code belongs in the same verdict.
- **Answer with evidence:** code linked at a commit, the commit or PR that explains the behaviour, the command that shows it.
