---
description: Create a large phased implementation plan with checkboxes, status log, and commit-per-phase workflow
---

You are planning a large feature or change.

User request:
$ARGUMENTS

Goal:

- Produce a terse but durable phased implementation plan file.
- Split the work into clear phases.
- Include checkbox progress tracking.
- Include a status log for implementation decision notes and changes.
- Require a git commit after every completed phase.
- Do not implement.

Before planning:

- Read `AGENTS.md` and any nearer `AGENTS.md` files that apply to the likely work area.
- Identify the repository's verification sequence from `AGENTS.md`.
- Inspect enough of the repo to define safe phase boundaries.
- Prefer phases that can each be verified independently.
- If requirements are ambiguous enough to affect architecture, data model, public API, migration strategy, or phase order, ask concise clarification questions first.

Create or update one file:

- Default path: `./plan.md` in the current working directory.
- If the repo already has a plan convention, use that convention instead.

The file must use this structure:

```md
# Plan: <short feature title>

## Goal
- <one or two bullets describing the outcome>

## Phase progress

### Phase 1: <phase name>
- [ ] <concrete step>
- [ ] <concrete step>

Verification after this phase:
- `<repo verification command/check from AGENTS.md>`
- `<phase-specific check>`

Commit after this phase:
- Required after verification passes.
- Suggested commit message: `<type(scope): concise summary>`

### Phase 2: <phase name>
- [ ] <concrete step>
- [ ] <concrete step>

Verification after this phase:
- `<repo verification command/check from AGENTS.md>`
- `<phase-specific check>`

Commit after this phase:
- Required after verification passes.
- Suggested commit message: `<type(scope): concise summary>`

### Phase 3: <phase name>
- [ ] <concrete step>
- [ ] <concrete step>

Verification after this phase:
- `<repo verification command/check from AGENTS.md>`
- `<phase-specific check>`

Commit after this phase:
- Required after verification passes.
- Suggested commit message: `<type(scope): concise summary>`

## Status log
- YYYY-MM-DD HH:MM — Plan created. Pending implementation.

## Implementation notes
- Complete phases sequentially unless repo evidence shows a safer order.
- After each phase: run the listed verification, update checkboxes, add status-log notes, then commit.
- Status-log entries should capture implementation decisions, meaningful deviations, changed files/areas, and verification results.
- Follow the plan pragmatically; adapt if repo evidence shows a simpler correct path.
- Keep each phase commit focused and revertable.
```

After writing:

- Report the file path.
- Summarize the phase boundaries and commit expectations.
- Do not implement.
