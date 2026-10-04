---
name: gherkin
description: Write Gherkin (Given/When/Then) scenarios. Use for the expected behaviour of every bug, acceptance criteria for an issue, a Cucumber .feature file, or reviewing a scenario; also when the user mentions Gherkin, BDD, Cucumber or Given/When/Then.
---

# Gherkin

A scenario is one concrete example of one behaviour, in the project's own words: given a state, when one thing happens, then something anyone can check.

## Rules

- **One behaviour,** named by a one-line title. A second `When` means a second scenario.
- **Domain words,** one term per concept, taken from the project's docs or `CONTEXT.md`. For a library or CLI, its public API, commands, options and output are domain words.
- **Given** holds only the state the outcome depends on, described as state rather than the steps that reach it.
- **When** is a single action.
- **Then** names something a reader can check: a value, a message, a file, a status, an exit code.
- **Real values** in double quotes, such as `"/about"` or `"nav.ts"`.
- **Steps** are third person, present tense, one fact each. `And` continues the phase above it; `But` marks a contrast.
- **Short:** under ten steps. A list of inputs is a table.

## A bug's scenario

It states the correct behaviour, so it fails today. Put it in a `gherkin` code block in the issue's expected-behaviour or acceptance section, and keep the actual behaviour in prose beside it. The regression test implements it ([testing](../testing/SKILL.md)).

```gherkin
Scenario: Exporting again rebuilds the pages that import a changed module
  Given the pages "/" and "/about" import "nav.ts"
  And "nav.ts" has changed since the last export
  When the site is exported again
  Then the exported "/" and "/about" show the new navigation
```

## More

| Task                                                                                     | Read                                                       |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| A `.feature` file: layout, Background, Rule, Scenario Outline, tables, doc strings, tags | [references/feature-files.md](references/feature-files.md) |
