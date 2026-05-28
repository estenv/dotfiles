---
description: Create a small, terse implementation plan for a feature
---

You are planning a small feature for implementation.

User request:
$ARGUMENTS

Goal:
- Produce a terse implementation plan file.
- Keep the plan simple.
- Do not split into phases.
- Do not include progress tracking.
- Do not implement.

Before planning:
- Read `AGENTS.md` and any nearer `AGENTS.md` files that apply to the likely work area.
- Identify the repository's verification sequence from `AGENTS.md`.
- Inspect only enough of the repo to make the plan concrete.
- If key requirements are ambiguous, ask concise clarification questions instead of writing a speculative plan.

Create or update one file:
- Default path: `./plan.md` in the current working directory.
- If the repo already has a plan convention, use that convention instead.

The file must use this structure:

```md
# Plan: <short feature title>

## Goal
- <one or two bullets describing the outcome>

## Implementation checklist
- <concrete step>
- <concrete step>
- <concrete step>

## Verification
- Repo verification sequence from AGENTS.md:
  - `<exact command or check>`
  - `<exact command or check>`
- Feature-specific checks:
  - `<check, test, or manual validation>`

## Implementation notes
- Follow this plan pragmatically; adjust if repo evidence shows a simpler correct approach.
- Keep the change minimal and idiomatic.
- Do not add speculative abstractions.
```

After writing:
- Report the file path.
- Give a short summary of the plan.
- Do not implement.
