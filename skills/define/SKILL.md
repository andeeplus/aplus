---
name: define
description: Turn an idea or a ticket into a spec ready to build, with the problem, the scope, the code it touches, acceptance criteria as Gherkin scenarios, and the decisions to make first. Use to define, spec, scope, refine or plan a feature, task or idea, or to write acceptance criteria before work starts.
---

# Define

A spec is the problem, scope, code, acceptance criteria and open decisions of one piece of work. It is done when someone who never saw the request could build it and know when it is finished.

**Project specifics** (domain terms, issue kinds, whether work needs an issue) come from the project's `AGENTS.md` and the project skill it names.

## Rules

- **Start from the problem.** Name who has the problem and what they cannot do today. A requested solution, such as "add a button", is one option, not the task.
- **Read before you specify.** Link every claim about the code at a commit. Mark what you could not check as an assumption.
- **Ask, never pick.** A choice that neither the request nor the code settles is a decision for the user or a maintainer: state the options and their trade-offs.
- **Stop at the spec.** Define does not build; it ends with a spec the user approves.

## Flow

1. **Read the request** whole, comments included. Read a ticket from a PM, client or support as [triage: non-technical](../triage/references/non-technical.md) says.
2. **Check it is new.** Search the tracker, open and closed, and the code and docs: it may already be supported, planned or rejected. If so, stop and report it. Skip what triage already checked.
3. **Note the gaps:** what the request leaves open about the problem, who has it, scope and constraints. Build on stated assumptions, and keep the questions for the review.
4. **Map the code.** Trace where the change lands: the entry points, the modules it touches, the nearby patterns to follow, and the behaviour that must not change.
5. **Specify.** Write the acceptance criteria as [Gherkin scenarios](../gherkin/SKILL.md): the main path, then each edge and failure that matters. List the non-goals, the risks and the open decisions.
6. **Size.** One PR when it lands as one reviewable change. Otherwise a program: one change per child issue in "blocked by" order, and a decision issue per open question, as [create-issue: programs](../create-issue/references/programs.md) says.
7. **Review.** Show the spec with its questions, and the drafts the caller asked for: issues written with [create-issue](../create-issue/SKILL.md), and for a ticket its edit or comment in a scratch file outside the tree. Wait for one approval, then publish what the user approves through the tracker's skill.

## Output

````
<title>
Problem: <who cannot do what today>
Scope: <what changes>   Non-goals: <what does not>
Code: <entry points and modules, linked at a commit>
Acceptance:
```gherkin
<scenarios>
```
Risks: <what could go wrong> | none
Decisions: <question: options and trade-offs> | none
Assumptions: <claims not verified> | none
Size: one PR | program of <n> changes
````
