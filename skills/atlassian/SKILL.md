---
name: atlassian
description: Run Bitbucket Cloud, Jira and Confluence work through atlassian-cli. Use for Bitbucket PRs, stacks, pipelines and merges; Jira issues, links, comments, transitions and a board; Confluence pages for specs and ADRs; and CLI setup.
---

# Atlassian

Every product goes through [atlassian-cli](https://github.com/omar16100/atlassian-cli) 0.10.0 or later, with `-f json` when you read the output. Where a command lacks a field, `atlassian-cli <bb|jira|confluence> api <path>` calls the REST API with the stored credentials.

## Rules

- **Resolve project settings.** Start with the project's instructions, which may name the Jira project, the board and its statuses. Read the CLI profile, repository configuration and contribution guidance for the workspace, repository, Jira project and Confluence space. Read product settings for issue types and merge methods. When several targets remain, use the one recent comparable work uses.

- **Ask before you publish,** unless the user asked for that exact action, or the [board](#board) mapping already approves the transition. Pushing, creating or editing PRs, issues, pages and comments, transitions and merging all publish.
- **A board is optional.** Follow [Board](#board).
- **Offer to record the tracker.** When you had to ask or infer the Jira project, board or statuses, offer to add them to the project's instructions so the next agent reads them. Edit that file only after the user agrees.
- **Keep tokens** in the CLI's stored profile or an environment variable.
- **Use scratch files** outside the tree for PR descriptions and issue and page bodies, so they are never committed.

## References

| Task                                                      | Read                                                 |
| --------------------------------------------------------- | ---------------------------------------------------- |
| Install the CLI, create tokens, log in, check permissions | [references/setup.md](references/setup.md)           |
| Pull requests, stacks, reviews, pipelines, merging        | [references/bitbucket.md](references/bitbucket.md)   |
| Jira issues: draft, create, link, comment, transition     | [references/jira.md](references/jira.md)             |
| Move an issue on a board                                  | [references/jira.md](references/jira.md#board)       |
| Confluence pages: concepts, specs, ADRs, RFCs             | [references/confluence.md](references/confluence.md) |

## Board

A Jira board is a view of issues in a project. Creating an issue does not need one. With none, skip it. With one, use it; with several, ask which.

1. Unless the project's instructions give the board and statuses, list them ([jira.md: Board](references/jira.md#board)) and ask once which status is in progress, which is in review, and which is done. Skip a step the user leaves unset. That answer approves the later transitions.
2. Confirm the issue shows on the board after creating it: a Scrum board puts it in the backlog, and a board's filter can leave it out.
3. Set in progress when work on it starts, in review when its PR opens, and done when that PR merges, not when work on the issue finishes.

## Script

[scripts/create-issues.mts](scripts/create-issues.mts) validates Jira drafts and, with `--apply`, creates and links them. Run it with Node 22.6 or later:

```sh
node --experimental-strip-types <this skill's folder>/scripts/create-issues.mts <file.md | folder> --project <KEY> [--apply]
```

Without `--apply` it only validates and prints what it would create. `<issue script>` in the references means this command.
