# Stacks

Stacks are GitHub stacked pull requests, managed with the [gh-stack](https://github.com/github/gh-stack) extension (`gh extension install github/gh-stack` when `gh stack` is missing). The trunk is the integration branch. `gh stack submit` and `gh stack modify` open an interactive editor, so an agent opens the PRs itself:

```sh
gh stack init --base <integration branch> <bottom> <next> <top>   # create or adopt the branches, bottom to top
gh stack bottom                                                   # commit each layer on its own branch; move with up, down, top
gh stack push                                                     # push every branch
gh pr create --head <branch> --base <branch below> --title "<commit-expert title>" --body-file <scratch>/pr.md
gh stack sync                                                     # link the open PRs into one stack on GitHub
```

- **Open bottom up.** The bottom PR targets the integration branch. Once `gh stack sync` has created the stack, add the stack number that `gh stack view` prints to every PR's stack note; GitHub links it to the stack.
- **Change a layer.** Commit on its branch, then `gh stack sync`: it rebases the branches above and onto the moved trunk, pushes every branch with `--force-with-lease` and updates the stack on GitHub. On a conflict it changes nothing; run `gh stack rebase`, resolve, `gh stack rebase --continue`, and sync again.
- **Add a layer.** `gh stack top`, then `gh stack add <branch>`, commit, push and open its PR on the branch below, then `gh stack sync`.
- **Merge, only when asked:** `gh stack merge <pr> --yes --<method>` merges every PR up to and including `<pr>` into the integration branch in one all-or-nothing step. Never merge a stacked PR on its own: it would land in the branch below it. Afterwards `gh stack sync --prune` deletes the merged local branches.
