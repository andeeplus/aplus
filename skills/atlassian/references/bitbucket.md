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
- **Issues:** put each Jira key in the branch name, such as `feat/PROJ-12-<slug>`, the title, and each commit's footer as `Refs: PROJ-12`. Jira links the branch, commits and PR to the issue. A merge transitions nothing: move the issues yourself ([jira.md](jira.md)).
- **Reviewers:** `--default-reviewers` adds the repository's defaults, which the API otherwise skips.

## Stacks

A stacked PR's destination is the branch below. After changing a lower branch, rebase the branches above onto it and push them with `--force-with-lease`.

Merge bottom up with [scripts/merge-stack.mts](../scripts/merge-stack.mts). It retargets every open PR stacked on the PR to its destination, reads each back, and merges only if all moved, because Bitbucket can accept the retarget without applying it. Run it for each PR in turn:

```sh
node --experimental-strip-types <this skill's folder>/scripts/merge-stack.mts <repo> <id> --strategy <merge_commit|squash|fast_forward> [--apply]
```

Without `--apply` it prints the plan.

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

Merge checks (approvals, no requested changes, no open tasks, a green pipeline) block only on the Premium plan, so confirm them yourself first. A single PR, or the bottom of a stack, merges with the script above. A PR with nothing stacked on it also merges with `atlassian-cli bb pr merge <repo> <id> --strategy <strategy> --message "<title>"`.
