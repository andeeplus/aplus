# Changelog

## 0.1.2

### Patch Changes

- 2ffd145: audit: run the program's issues through deliver, automatically, issue after issue with every gate, and end with the drafts for deferred findings for the user to approve
- 2ffd145: define: turn an idea or a ticket into a spec with its scope, the code it touches, Gherkin acceptance criteria and the decisions to make first
- 2ffd145: deliver: take an idea, a ticket or a program of issues to pull requests ready to merge. For a new ticket or idea, triage or define runs first and the user reviews the spec and its issue drafts; then the build, final-review and the PR run automatically, issue after issue, asking only before a dangerous action. An issue that cannot go on is parked and the run continues. The run ends with the drafts for deferred findings in its output, created once the user approves them.

## 0.1.1

### Patch Changes

- 97928b9: atlassian: fill in Bitbucket's `.bitbucket/pull_request_template.md`, and give Jira issues the default form sections when the project lists none
- 88c7f69: github: install default issue forms and labels with `create-issues.mts --init` when a repository has none
- bfaad65: second-opinion: allow an optional third round that checks the fixes from round 2

## 0.1.0

The first set of skills.
