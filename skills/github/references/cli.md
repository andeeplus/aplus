# gh commands

`gh api` fills in `{owner}` and `{repo}` from the current repository.

## Repository

```sh
gh repo view --json defaultBranchRef --jq .defaultBranchRef.name   # the default branch
gh browse <path>:<line> --commit=<sha> --no-browser                # a link to code at a commit
gh api repos/{owner}/{repo}/milestones --jq '.[].title'            # existing milestones
```

## Issues

Create issues with the [issue script](../SKILL.md#issue-script), never with `gh issue create`.

```sh
gh issue list --search "<key words>" --state all              # look for a duplicate
gh issue view <n> --comments                                  # the whole thread
gh issue view <n> --json blockedBy,parent                     # what one issue waits on
gh issue view <tracking> --json subIssues                     # a program's changes and their state
gh issue edit <n> --type <name>                               # set the issue type
gh issue edit <n> --add-label <label> --milestone <title>
gh issue edit <n> --parent <p> --add-blocked-by <m>
gh issue comment <n> --body-file <scratch>/comment.md
gh issue close <n> --comment "Fixed in #<pr>"                 # fixed by a PR that merged into a non-default branch
gh issue close <n> --reason "not planned" --comment "<why>"   # won't fix
gh issue close <n> --duplicate-of <m>                         # a duplicate of #<m>
```

## Pull requests

A PR body lists each issue it resolves as `Closes #<n>`. GitHub closes them only when the PR merges into the default branch.

```sh
git push -u origin <branch>
gh pr create --base <integration branch> --title "<title>" --body-file <scratch>/pr.md
gh pr edit <n> --body-file <scratch>/pr.md
gh pr merge <n> --squash                                      # or --merge, as the project specifies
```

A stacked PR is opened and merged as [stacks.md](stacks.md) shows.

## CI

```sh
gh pr checks <n>                         # status of every check on a PR
gh run list --branch <branch> --limit 5  # recent workflow runs
gh run view <run-id> --log-failed        # only the failing steps' logs
gh run rerun <run-id> --failed           # rerun failed jobs (ask first)
```

The workflows in `.github/workflows/` name the script each job runs. Reproduce a failure locally with the same script before changing code.

## Reviews

```sh
gh pr view <n> --comments                         # conversation and review summaries
gh api repos/{owner}/{repo}/pulls/<n>/comments    # inline review comments with id, path and line
gh pr diff <n>                                    # the diff under review
gh api repos/{owner}/{repo}/pulls/<n>/comments/<comment-id>/replies -f body="<what changed>"   # reply on a thread
```
