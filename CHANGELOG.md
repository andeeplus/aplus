# Changelog

## 0.1.4

### Patch Changes

- c6abc08: senior-technical-writer: explain project terms when the intended reader needs their meaning
- c6abc08: final-review: count a deferred rework as logged once its issue is agreed, or drafted for review after the PR

    deliver: open the PR with out-of-scope rework drafted, and park work that is still not ready

- c6abc08: create-pr: name the branch type/ticket-slug, so feat, fix, refactor and the other types carry the issue key
- c6abc08: code-quality: apply DRY to shared knowledge, and ETC by the concrete change a design makes easier

    define: use the shared design principles when assessing options

    debug: choose the fix using those principles

- c6abc08: plain: explain a change as a brief and a primer, adding only the context the reader needs
- c6abc08: debug: test hypotheses from evidence, investigate restart effects, and keep related fixes within scope
- c6abc08: define, create-pr, deliver, commit-expert, final-review, testing, github, atlassian and senior-technical-writer: follow project instructions, configuration and existing conventions without requiring an AGENTS.md or project skill
- c6abc08: create-pr: push and open once asked, and take an unstated policy from the project

    atlassian: use recent comparable work when several targets remain

    deliver: resolve the target, merge method and branch name without a further question

- c6abc08: senior-technical-writer: say what a code comment carries, and treat a comment the code contradicts as drift
- c6abc08: code-quality: mark the imported entry point with metadata.vendored so only that flag keeps its source shape, and note the source revision and local modifications on its license

## 0.1.3

### Patch Changes

- ad94790: audit: choose where the audit files go with `APLUS_AUDIT_DIRS`, and mirror them to a notes vault per project with `{project}`
- ad94790: second-opinion: read the reviewers and API keys from `APLUS_SECOND_OPINION_*` variables

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
