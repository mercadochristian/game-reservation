# Agent Prompts

These files are specialized role prompts for Codex delegation.

## How to use

- Use them as prompt templates when spawning Codex subagents.
- They are reference prompts, not an auto-registered agent manifest.
- Keep role intent and review standards in sync with project rules.

## Available prompts

- `frontend-designer`
- `security-reviewer`
- `performance-reviewer`
- `code-reviewer`
- `doc-reviewer`
- `senior-code-reviewer`
- `nextjs-supabase-architect`
- `frontend-ui-crafter`
- `unit-test-engineer`
- `feature-doc-writer`
- `volleyball-lineup-architect`

## Adding your own

Add a new markdown file in this directory with:

1. Role name and responsibility
2. Scope and non-goals
3. Review/quality checklist
4. Output format expectations
