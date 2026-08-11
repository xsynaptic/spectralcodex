# CLAUDE.md

@../AGENTS.md

## Claude Code

General coding, TypeScript, and styling conventions live in the global directives. The sections below are Claude Code specific; everything shared with other agents lives in `AGENTS.md`.

### Plan Mode

- Use plan mode anytime new features are being added or old features are receiving significant updates.
- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, provide a list of unresolved questions to answer, if any.

### Task tracking

Tracked as markdown files under `.claude/`: `tasks/` (active), `tasks-backlog/` (proposals, deferred, superseded), `tasks-completed/` (done, delete anytime). Each file in `tasks/` and `tasks-backlog/` opens with YAML frontmatter: `status` (`proposal` | `accepted` | `deferred` | `superseded`), `created` (ISO date), and optional `area`. Converted plans may also carry `priority` / `effort` / `depends` / `source`. `completed` is implied by the folder. When a task is fully done, move it to `tasks-completed/`.
