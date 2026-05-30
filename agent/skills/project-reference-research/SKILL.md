---
name: project-reference-research
description: Researches external or local repos/projects as reference context. Use when the user says “look at X”, “compare with X”, “how does X do it”, “inspect my/local X repo”, gives a GitHub URL, or asks to use another project as a reference.
---

# Project Reference Research

## Purpose
Resolve a referenced repository, keep a local checkout in the right place, then send one deep explorer subagent to investigate it and return evidence-backed findings.

## Repository homes
- Prefer an existing local checkout when one is obvious from the current workspace or user-provided path.
- For new clones, use `~/Work` for the user’s own projects and `~/Frameworks` for third-party reference repos when those directories exist.
- If neither directory exists, clone under the current working directory or ask for a destination when the choice matters.

## Workflow
1. **Resolve the repo**
   - If the user gives a GitHub URL, use it.
   - If the user names a repo, first check the current workspace, `~/Work/<name>`, and `~/Frameworks/<name>` when those locations exist.
   - If there is no local match, infer the most likely GitHub repository from the user's wording and clone the best match.
   - Only ask for clarification if multiple matches look equally plausible or no credible repo can be found.

2. **Clone or update**
   - Use `~/Work/<repo>` for the user’s own projects when available.
   - Use `~/Frameworks/<repo>` for third-party repos when available.
   - If missing and a URL is known, clone it.
   - If present, check `git status --short`.
   - If clean, update the current/default branch.
   - If dirty, do not pull/reset/stash; use it as-is and mention that it was dirty.

3. **Investigate with one deep explorer**
   - Spawn exactly one `explore_subagent` with `mode: deep` and `cwd` set to the repo path.
   - The subagent brief must be standalone: repo path, user question, what to inspect, and “do not edit files”.
   - Set `fork_context: false` when the host supports it.
   - Close the explorer session after it finishes when the host requires explicit closure.

4. **Verify before answering**
   - Read the important files the explorer points to before making precise claims.
   - Separate evidence from inference.
   - Prefer local file citations with line numbers.

## Safety
- Never overwrite, reset, stash, clean, or switch branches in a dirty referenced repo without explicit approval.
- Do not edit the referenced repo; it is context only.
- Do not spawn multiple explorers unless the user explicitly asks.

## Final answer
Include:
- repo path used
- whether it was cloned, updated, already present, or used dirty/as-is
- concise findings
- file path citations with line numbers where useful
- practical takeaways for the current task
