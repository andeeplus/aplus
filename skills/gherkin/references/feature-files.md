# Feature files

Where the project already has `.feature` files, match them. Full syntax: the [Gherkin reference](https://cucumber.io/docs/gherkin/reference/).

## Layout

- One `Feature:` per file, in a kebab-case `.feature` file named after it.
- Two-space indents. One blank line between scenarios, none between steps.
- Under `Feature:`, a three-line story when it helps: `As a <role>`, `I want <goal>`, `So that <reason>`.

```gherkin
Feature: Static export
  As a site author
  I want an export to rebuild what my change affects
  So that the deployed site matches my source

  Background:
    Given a site with the pages "/" and "/about"

  Rule: A page rebuilds when a module it imports changes

    Scenario: Exporting again rebuilds the pages that import a changed module
      Given "/" and "/about" import "nav.ts"
      And "nav.ts" has changed since the last export
      When the site is exported again
      Then the exported "/" and "/about" show the new navigation
```

## Grouping

- **Background:** `Given` steps that every scenario in its Feature or Rule shares. One per Feature or Rule.
- **Rule:** the scenarios that illustrate one business rule. It may have its own Background.
- **Tags:** `@name` on the line above a Feature, Rule or scenario, for the test runner to filter on.

## Data

- **Scenario Outline** with `Examples:` when the same behaviour varies only by input. Each `<name>` in the steps takes that column's value from one row.

    ```gherkin
    Scenario Outline: The cache strategy sets the cache-control header
      Given a page with the cache strategy "<strategy>"
      When the page is requested
      Then the response has the cache-control header "<header>"

      Examples:
        | strategy | header                    |
        | static   | public, max-age=31536000  |
        | dynamic  | no-store, must-revalidate |
    ```

- **Data table** after a step for a list of inputs or one record's fields. Short headers; the table fits on one screen.
- **Doc string** between `"""` lines after a step for multi-line text, such as a JSON body or an error message. `"""json` names its type.
