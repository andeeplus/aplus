# Jira

## The draft

The format is [the GitHub draft format](../../github/references/issues.md#the-draft), with `template` set to the Jira issue type (such as Bug, Task or Epic), no `milestone`, and a free Markdown body: `##` headings, code blocks, and a bug's Gherkin scenario in a `gherkin` block. Use the sections in the project's issue templates or contribution guidance. When neither defines them, use the fields of the matching [default issue form](../../github/assets/ISSUE_TEMPLATE/) as `##` headings in the form's order: `bug.yml` for a Bug, `task.yml` for a Task, `tracking.yml` for an Epic, and `decision.yml` for a decision, filed as a Task.

## Create

```sh
<issue script> path/to/folder                 # validate against the project's issue types and required fields
<issue script> path/to/folder --apply         # create in dependency order (ask the user first)
```

It creates parents before children and blockers first, reads each "blocks" link back and corrects an inverted one, and records `key → Jira key` in `manifest.json` beside the drafts, so a re-run creates only what is missing. A project that requires a custom field is rejected: create that issue with the commands below and `--field`.

## Board

The [board](../SKILL.md#board) is optional. Creating an issue does not need one. `<P>` is the Jira project key.

```sh
atlassian-cli -f json jira api /rest/agile/1.0/board --query projectKeyOrId=<P>
atlassian-cli -f json jira api /rest/api/3/project/<P>/statuses
```

The statuses are the `--to-status` names, grouped by issue type. Board column titles can differ. Read the current status with `jira issue get` below before a transition, then transition with the command in [Other commands](#other-commands). When several boards exist, ask which in the same question as the statuses.

## Other commands

```sh
atlassian-cli -f json jira issue search --jql 'project = <P> AND text ~ "<key words>"'   # look for a duplicate
atlassian-cli -f json jira issue create --project <P> --issue-type <type> --summary "<title>" --description "$(cat <scratch>/issue.md)" --field 'labels=["<label>"]'
atlassian-cli -f json jira issue create … --field 'parent={"key":"<epic key>"}'          # a program's change
atlassian-cli jira issue links create <blocker> <blocked> --link-type Blocks
atlassian-cli -f json jira issue links list <blocked>                                    # confirm it reads "is blocked by <blocker>"
atlassian-cli jira issue comments add <key> --body "<text>"
atlassian-cli jira issue transition <key> --to-status "<status>" --dry-run              # then without --dry-run
atlassian-cli -f json jira issue get <key>                                               # current status, before a transition
atlassian-cli -f json jira api /rest/api/3/myself                                        # the logged-in user; its accountId
atlassian-cli jira issue assign <key> --assignee <accountId>                             # that user, when set in progress
```

- **Link direction** is easy to invert: after creating a link, read it back, and recreate it the other way round when it is wrong.
- **Custom fields:** `jira fields list` gives their ids for `--field`.
