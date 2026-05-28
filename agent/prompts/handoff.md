---
description: Write the current planned task to a concise implementation handoff file
---

You are preparing a handoff file for another coding agent.

Input from the user:
$ARGUMENTS

Goal:
- Capture the task that has already been planned in this current session.
- Write a Markdown handoff file that a fresh implementation agent can execute without needing the conversation.
- Keep it concise and implementation-oriented.

Before writing:
- Read `AGENTS.md` and any nearer `AGENTS.md` files that apply to the work area.
- Identify the repository's verification sequence from `AGENTS.md`.
- If the plan depends on unclear requirements, list only the blocker questions instead of inventing missing details.

Create or update one file:
- Default path: `./plan.md` in the current working directory.
- If the repo already has a clearly established plan-file convention, use that convention instead.

The file must use this structure:

```md
# Plan: <short task title>

## Goal
- <one or two bullets describing the intended outcome>

## Current context
- <what has already been decided or discovered>
- <important constraints from the current session>

## Implementation checklist
- [ ] <concrete implementation step>
- [ ] <concrete implementation step>
- [ ] <concrete implementation step>

## Verification
- Repo verification sequence from AGENTS.md:
  - `<exact command or check>`
  - `<exact command or check>`
- Additional task-specific checks:
  - `<check, test, or manual validation>`

## Notes for the implementing agent
- Follow the checklist pragmatically; adapt if repo evidence shows a simpler correct path.
- Do not overengineer. Prefer the smallest coherent change that satisfies the goal.
- Preserve existing project conventions.
- If requirements conflict with repo instructions, stop and ask.
```

After writing the file:
- Report the file path.
- Summarize any assumptions or blocker questions.
- Do not implement the task.
