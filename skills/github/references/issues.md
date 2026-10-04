# Issues

What to write comes from [create-issue](../../create-issue/SKILL.md). This file is the GitHub format and how to create it.

## The draft

One Markdown file per issue: frontmatter, then the body. The angle-bracket values are placeholders:

```markdown
---
template: <form file name, such as bug>
title: Production export reuses stale pages after a shared module changes
labels: [<from .github/labels.yml>]
milestone: <an existing milestone>
---

### Problem

…
```

| Field       | Required | Meaning                                                                                                                                                                               |
| ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `template`  | yes      | The file name of a form in `.github/ISSUE_TEMPLATE/`, without the extension. It sets the issue type, the default labels and the allowed sections.                                     |
| `title`     | yes      | Plain sentence case: the defect or the outcome                                                                                                                                        |
| `labels`    | no       | A list. With `.github/labels.yml`, each must be listed there; choose by the descriptions.                                                                                             |
| `milestone` | no       | Pick an existing one ([cli.md: Repository](cli.md#repository)) by the project's convention. A new title is created, so add one only when the convention calls for a new release line. |
| `parent`    | no       | Key of the tracking issue this one belongs to                                                                                                                                         |
| `blockedBy` | no       | Keys of the issues that must land first                                                                                                                                               |
| `key`       | no       | Defaults to the file name. Other drafts refer to it.                                                                                                                                  |

**Body.** Use one `### Section` per field label of the form, in the form's order. Required fields must be present, and other sections are rejected. Read each field's `description` for what it holds. The sections match what the web form produces, so agent-written and human-written issues look alike.

**References between drafts.** In one folder, `#{KEY}` in a body becomes the issue number once that issue exists.

## Create

`<issue script>` is the command in [the skill's Issue script section](../SKILL.md#issue-script).

Look for a duplicate first ([cli.md: Issues](cli.md#issues)). Then:

```sh
<issue script> path/to/draft.md                      # validate and show what would be created
<issue script> path/to/draft.md --apply              # create it (ask the user first)
<issue script> path/to/folder --apply                # a whole set, in dependency order
```

The script records `key → issue number` in `manifest.json` beside the drafts. Re-running it creates only what is missing, and it fills in `#{KEY}` references and "blocked by" links as their targets appear. A `parent` must already exist or be created in the same run.
