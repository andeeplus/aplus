# Investigate

Work through these in order, and stop at the first step that decides the issue.

## 1. Duplicates

Search open and closed issues by the error message, the symptom, the API involved and the area, not only the words of the title: `gh issue list --state all --search "<words>"`.

| Match                                     | Do                                                          |
| ----------------------------------------- | ----------------------------------------------------------- |
| Clearly the same problem, still open      | Recommend closing as a duplicate, with the link             |
| Clearly the same problem, closed long ago | A possible regression, not a duplicate: say so and continue |
| Possibly related                          | Link it as uncertain in the recommendation, and continue    |
| Nothing close                             | Continue                                                    |

## 2. Details

Compare the report with the required fields of its issue form. When the reporter left out something you need to reproduce it (the version, the steps, the expected result, a reproduction), recommend asking for it: list what is established and exactly what is missing. Ask only for what you need.

## 3. Reproduce

Follow the project's reproduction setup, in a folder outside the tracked tree.

- Reproduce the exact symptom the reporter describes. Then check the baseline: undo the trigger and confirm the problem goes away.
- Stop after two failed setup attempts, and say what failed.
- The outcome is one of: reproduced; not reproduced, with what you tried; skipped, because of an unsupported version or runtime or a host you cannot run; or not enough detail.

## 4. Bug or intended

A bug is behaviour the authors did not know about or did not choose. Check the docs, code comments that explain why, `git blame` and the pull request behind the code, and earlier issues about the same behaviour.

The verdict is bug, intended or unclear, with high, medium or low confidence and the evidence for it. When unsure, choose unclear. Intended behaviour that users keep running into may still deserve a docs fix or a feature request.

## 5. Area and severity

Trace the cause far enough to pick the area from the code involved, not from the symptom. When no area label fits, say so rather than guess. For severity, match the descriptions in the labels file; a workaround lowers it.
