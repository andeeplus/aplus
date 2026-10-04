# Stacks and splits

- **Stack on the blocker.** While an issue's blocker has an open PR, the issue's PR branches from the blocker's branch and targets it. A blocker with no PR yet, such as an unanswered decision, is not a stack: wait for it.
- **Open bottom up** with the host skill's stack steps. Each body starts with the template's stack note: the whole chain, bottom to top. Update every note when a layer is added.
- **Split finished work** through a local backup branch: commit everything to it, build each PR's branch with `git checkout <backup> -- <paths>`, check that `git diff <top branch> <backup>` is empty, then delete the backup.
