---
name: github
description: Run GitHub work through gh, following the project's schema in .github/. Use to create issues from drafts, edit and close issues, open PRs and stacks (gh-stack), read checks and reviews, reply to a review, and merge.
---

# GitHub

Every agent does GitHub work the same way: formats come from the repository's `.github/` folder, commands from the files below. Do not improvise a format, label or command they already define. What to do and when comes from [create-issue](../create-issue/SKILL.md) and [create-pr](../create-pr/SKILL.md).

**Project specifics** (the integration branch, the merge method, milestone and label conventions, an alias for the issue script) come from the project's `AGENTS.md` and the project skill it names. If neither says, the integration branch is the default branch: `gh repo view --json defaultBranchRef`.

## Rules

- **Ask before you publish,** unless the user asked for that exact action. Pushing, creating or editing issues and PRs, commenting and merging all publish.
- **Issues come from draft files.** Write a draft and run the issue script below. Never call `gh issue create` by hand: the script validates the draft against the issue forms and labels, then sets the type, labels, milestone, parent and "blocked by" links.
- **The schema is in `.github/`.** The forms in `.github/ISSUE_TEMPLATE/` define each kind of issue and its sections. `.github/labels.yml`, when present, lists the allowed labels. `.github/pull_request_template.md` is the PR body. Read them; do not restate them.
- **Use scratch files** outside the tree for drafts and PR bodies, so they are never committed.
- **Never** put a token on the command line, force-push the integration branch or someone else's branch, or link a local or gitignored file from an issue or PR. Stack branches are rewritten only through `gh stack`, which pushes with `--force-with-lease`.

## References

| Task                                                                          | Read                                         |
| ----------------------------------------------------------------------------- | -------------------------------------------- |
| Any `gh` command: issues, pull requests, CI results, review comments, merging | [references/cli.md](references/cli.md)       |
| The issue draft format; create issues with the script                         | [references/issues.md](references/issues.md) |
| Create, change or merge a stack of pull requests                              | [references/stacks.md](references/stacks.md) |

## Script

[scripts/create-issues.mts](scripts/create-issues.mts) validates drafts and, with `--apply`, creates them. Run it from inside the repository with Node 22.6 or later, or through the project's alias when it has one:

```sh
node --experimental-strip-types <this skill's folder>/scripts/create-issues.mts <file.md | folder> [more files] [--repo owner/name] [--apply]
```

Without `--apply` it only validates and prints what it would create, with each issue's labels and milestone. `<issue script>` in the references means this command.
