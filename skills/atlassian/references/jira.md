# Jira

## The draft

The format is [the GitHub draft format](../../github/references/issues.md#the-draft), with `template` set to the Jira issue type (such as Bug, Task or Epic), no `milestone`, and a free Markdown body: `##` headings, code blocks, and a bug's Gherkin scenario in a `gherkin` block. Use the sections the project skill lists.

## Create

```sh
<issue script> path/to/folder                 # validate against the project's issue types and required fields
<issue script> path/to/folder --apply         # create in dependency order (ask the user first)
```

It creates parents before children and blockers first, reads each "blocks" link back and corrects an inverted one, and records `key → Jira key` in `manifest.json` beside the drafts, so a re-run creates only what is missing. A project that requires a custom field is rejected: create that issue with the commands below and `--field`.

## Other commands

```sh
atlassian-cli -f json jira issue search --jql 'project = <P> AND text ~ "<key words>"'   # look for a duplicate
atlassian-cli -f json jira issue create --project <P> --issue-type <type> --summary "<title>" --description "$(cat <scratch>/issue.md)" --field 'labels=["<label>"]'
atlassian-cli -f json jira issue create … --field 'parent={"key":"<epic key>"}'          # a program's change
atlassian-cli jira issue links create <blocker> <blocked> --link-type Blocks
atlassian-cli -f json jira issue links list <blocked>                                    # confirm it reads "is blocked by <blocker>"
atlassian-cli jira issue comments add <key> --body "<text>"
atlassian-cli jira issue transition <key> --to-status "<status>" --dry-run              # then without --dry-run
atlassian-cli -f json jira issue get <key>
```

- **Link direction** is easy to invert: after creating a link, read it back, and recreate it the other way round when it is wrong.
- **Custom fields:** `jira fields list` gives their ids for `--field`.
