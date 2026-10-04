# Jira

## The draft

`--description` takes Markdown and converts it to Jira's format, code blocks included. Use the project's issue types (a bug, a task, an epic for a program) and the sections its project skill lists, as `##` headings. A bug's Gherkin scenario goes in a `gherkin` code block.

## Commands

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
