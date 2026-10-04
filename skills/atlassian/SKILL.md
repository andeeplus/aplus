---
name: atlassian
description: Bitbucket Cloud, Jira and Confluence through atlassian-cli. Use for Bitbucket pull requests, stacks, pipelines and merges; Jira issues, links, comments and transitions; Confluence pages for concepts, specs, ADRs and RFCs; and setting up the CLI and its tokens.
---

# Atlassian

Every product goes through [atlassian-cli](https://github.com/omar16100/atlassian-cli) 0.10.0 or later, with `-f json` when you read the output. Where a command lacks a field, `atlassian-cli <bb|jira|confluence> api <path>` calls the REST API with the stored credentials.

**Project specifics** (workspace, repository, Jira project and issue types, Confluence space, merge strategy, the PR description's sections) come from the project's `AGENTS.md` and the project skill it names.

## Rules

- **Ask first.** Pushing, creating or editing PRs, issues, pages and comments, transitions and merging all publish. Do them only after the user approves, unless they asked for that exact action.
- **Tokens** stay in the CLI's stored profile or an environment variable.
- **Scratch files** (PR descriptions, issue and page bodies) go outside the tree.

## Load what the task needs

| Task                                                      | Read                                                 |
| --------------------------------------------------------- | ---------------------------------------------------- |
| Install the CLI, create tokens, log in, check permissions | [references/setup.md](references/setup.md)           |
| Pull requests, stacks, reviews, pipelines, merging        | [references/bitbucket.md](references/bitbucket.md)   |
| Jira issues: draft, create, link, comment, transition     | [references/jira.md](references/jira.md)             |
| Confluence pages: concepts, specs, ADRs, RFCs             | [references/confluence.md](references/confluence.md) |

## Issue script

[scripts/create-issues.mts](scripts/create-issues.mts) validates Jira drafts and, with `--apply`, creates and links them. Run it with Node 22.6 or later:

```sh
node --experimental-strip-types <this skill's folder>/scripts/create-issues.mts <file.md | folder> --project <KEY> [--apply]
```

Without `--apply` it only validates and prints what it would create. `<issue script>` in the references means this command.
