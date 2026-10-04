# Recommend

## To the user

One block per issue, then the comment draft if there is one. Then stop and wait.

```
#<n> <title>
Kind: bug | feature | question | needs decision    Confidence: high | medium | low
Duplicate: none | #<m>, same problem | #<m>, possibly related
Reproduced: yes | no | skipped (<why>) | not enough detail
Evidence: <one to three lines, with file:line or links>
Type: <keep | set to ...>    Labels: add <...>, remove <...>
Next: comment | ask for details | close as duplicate of #<m> | close as not planned | draft a decision | ready to fix
```

## The comment

Start every comment with this line:

```
> Drafted by an AI agent during triage and reviewed by a maintainer.
```

Then one of these, kept short:

- **Asking for details.** What is established so far, as bullets, then the specific questions that would let you reproduce it. Each question must have a clear answer.
- **Confirmed.** What was reproduced and how, the cause if known, and a workaround if there is one.
- **Duplicate.** The link to the original, and one line on why it is the same problem.
- **Intended or not planned.** The intended behaviour, with a link to the docs or the code that defines it, and a workaround if there is one.

Link code at a commit. Leave out local paths and anything from private notes.
