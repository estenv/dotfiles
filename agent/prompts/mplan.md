---
description: Create a medium phased implementation plan with checkbox progress tracking
---

You are planning a medium-sized feature or change.

User request:
$ARGUMENTS

Goal:
- Produce a terse phased implementation plan file.
- Split the work into a small number of meaningful phases.
- Include checkbox progress tracking.
- Do not mention commits unless the user explicitly requested commits.
- Do not implement.

Before planning:
- Read `AGENTS.md` and any nearer `AGENTS.md` files that apply to the likely work area.
- Identify the repository's verification sequence from `AGENTS.md`.
- Inspect enough of the repo to choose practical phase boundaries.
- If requirements are ambiguous enough to change the phase structure, ask concise clarification questions first.

Create or update one file:
- Default path: `./plan.md` in the current working directory.
- If the repo already has a plan convention, use that convention instead.

The file must use this structure:

```md
# Plan: <short feature title>

## Goal
- <one or two bullets describing the outcome>

## Phases

### Phase 1: <phase name>
- [ ] <concrete step>
- [ ] <concrete step>

Verification after this phase:
- `<repo verification command/check from AGENTS.md>`
- `<phase-specific check>`

### Phase 2: <phase name>
- [ ] <concrete step>
- [ ] <concrete step>

Verification after this phase:
- `<repo verification command/check from AGENTS.md>`
- `<phase-specific check>`

### Phase 3: <phase name>
- [ ] <concrete step>
- [ ] <concrete step>

Verification after this phase:
- `<repo verification command/check from AGENTS.md>`
- `<phase-specific check>`

## Implementation notes
- The implementing agent should complete multiple phases in one run when safe.
- Follow the plan pragmatically; adapt if repo evidence shows a simpler correct path.
- Keep changes minimal, idiomatic, and covered by the listed checks.
- Do not add commit requirements unless separately instructed by the user.
```

After writing:
- Report the file path.
- Summarize the phases in one short paragraph.
- Do not implement.
