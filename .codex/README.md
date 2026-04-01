# Codex Configuration

This directory is the Codex-facing mirror of the project's Claude configuration.

## Purpose

- Keep `.claude/` intact for Claude workflows.
- Provide Codex-ready equivalents in `.codex/` and `.agents/skills/`.
- Allow both tools to operate in the same repository without overwriting each other.

## Mapping

- `CLAUDE.md` -> `AGENTS.md`
- `.claude/rules/*` -> `.codex/rules/*`
- `.claude/agent-memory/*` -> `.codex/memory/*`
- `.claude/agents/*` -> `.codex/agents/*` (reference role prompts)
- `.claude/skills/*` -> `.agents/skills/*`

## Notes

- `.claude/worktrees/*` is intentionally not mirrored; those are ephemeral Claude worktree artifacts.
- `.claude/settings.local.json` is Claude-specific and intentionally not converted to avoid invalid assumptions in Codex.
