# Bitbucket

`bb` is short for `bitbucket`. The workspace comes from the profile or `--workspace`; `<repo>` is the repository slug.

## Pull requests

```sh
git push -u origin <branch>
atlassian-cli -f json bb pr create <repo> --title "<title>" --source <branch> --destination <base> --description "$(cat <scratch>/pr.md)" --default-reviewers
atlassian-cli -f json bb pr update <repo> <id> --description "$(cat <scratch>/pr.md)"
atlassian-cli -f json bb pr list <repo> --state OPEN
atlassian-cli -f json bb pr get <repo> <id>
atlassian-cli bb api /2.0/repositories/<ws>/<repo>/pullrequests/<id>/diff    # the diff itself; `bb pr diff` prints only a link
```

- **Description:** Bitbucket has no template file, so take its sections from the project skill.
- **Issues:** put each Jira key, such as `PROJ-12`, in the branch name and the title. A merge transitions nothing: move the issues yourself ([jira.md](jira.md)).
- **Reviewers:** `--default-reviewers` adds the repository's defaults, which the API otherwise skips.

## Stacks

A stacked PR's destination is the branch below. After changing a lower branch, rebase the branches above onto it and push them with `--force-with-lease`. Before merging a PR that has PRs on top, retarget each one to the merge's destination, then check it with `bb pr get`:

```sh
atlassian-cli bb api /2.0/repositories/<ws>/<repo>/pullrequests/<child id> -X put -d '{"destination":{"branch":{"name":"<base>"}}}'
```

Merge bottom up.

## Reviews

```sh
atlassian-cli -f json bb pr comments <repo> <id>                                     # every thread, with ids
atlassian-cli bb pr comment <repo> <id> --text "<what changed>" --parent <comment id>   # reply on a thread
atlassian-cli bb pr approve <repo> <id>
```

## Pipelines

```sh
atlassian-cli bb pipeline status <repo> --wait          # exit 0 passed, 1 failed, 2 running, 3 paused
atlassian-cli -f json bb pipeline list <repo> --pr <id>
atlassian-cli bb pipeline logs <repo> <build number> --failed-only
```

## Merge

Merge checks (approvals, no requested changes, no open tasks, a green pipeline) block only on the Premium plan, so confirm them yourself first. Then, with the project's strategy:

```sh
atlassian-cli bb pr merge <repo> <id> --strategy <merge_commit|squash|fast_forward> --message "<title>"
```
