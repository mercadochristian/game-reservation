# Volleyball Game Reservation System

A full-stack web application for managing volleyball game reservations, player registrations, and administrative operations. Supports three user roles: **Admin** (schedules, payments, registrations), **Facilitator** (game-day ops, QR attendance, team management), and **Player** (registration, profile).

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Architecture

**Tech**: Next.js 15 (app router) + React 19 + TypeScript 5. Styling with Tailwind v4, animations with Framer Motion v12. Forms via React Hook Form + Zod. Backend is Supabase (PostgreSQL + Auth via email/password).

**Directory structure:**
- `src/app/` — Role-based pages and layouts (`admin/`, `player/`, `facilitator/`, `auth/`, `create-profile/`, `api/profile/complete/`)
- `src/components/` — UI primitives (custom shadcn-style on `@base-ui/react`) and `app-shell.tsx` (universal nav)
- `src/lib/` — Supabase clients (browser + server), branding config, Zod validation schemas, typed exports from `src/types/`
- `/docs/` — `CODEBASE.md` (technical reference) and `FUNCTIONAL.md` (stakeholder reference)

**Auth flow** enforced by middleware (`src/middleware.ts`):
1. Unauthenticated → `/auth` (email/password sign in or sign up)
2. Authenticated + no profile → `/create-profile` (players only)
3. Authenticated + profile complete → role dashboard (`/admin`, `/facilitator`, `/player`)

**Layouts**: `AppShell` wraps all role dashboards. Mobile (<1024px) uses fixed top bar (64px) with hamburger drawer; desktop (≥1024px) uses fixed left sidebar (256px).

## Key Decisions

**Dark mode first** — Design and implement for dark mode as the primary target. All components must be built with dark mode in mind first. Light mode is secondary.

**Mobile-first, scale beautifully** — Start with mobile layouts (single column, stacked) and progressively enhance for larger screens (tablets, desktops). Ensure layouts adapt gracefully across all breakpoints with readable text and accessible spacing.

**Email/password auth** — Supabase auth via `@supabase/ssr` middleware. Users sign up with email + password, or sign in with existing credentials. See [`.claude/rules/supabase.md`](.claude/rules/supabase.md) for the full client selection decision tree.

**Framer Motion animation pattern** — All staggered animations use a consistent `fadeUpVariants` object with `custom` prop for delay control. Ensures visual consistency across the app.

**Headless UI + custom primitives** — Using `@base-ui/react` (unstyled, accessible) rather than pre-styled components. Gives us full design control while maintaining accessibility standards.

**Role-based nav in AppShell** — Nav items are defined per role in a single `NAV_ITEMS` object in `src/components/app-shell.tsx`. Supports "coming soon" items (opacity-faded, disabled). Single source of truth for navigation structure.

**Branding via config file** — `branding.json` at project root is loaded via `src/lib/config/branding.ts`. Allows rebranding without code changes.

## Behavioral Guidelines

### Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### Self-Improvement Loop
- After ANY correction from the user: update memory with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review memory at session start for relevant project context

### Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

### Task Management
- Plan first with checkable items before implementation
- Verify plan before starting implementation
- Track progress and mark items complete as you go
- Explain changes with high-level summary at each step
- Document results and capture lessons after corrections

### Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.

## Domain Knowledge

**User roles:**
- **Admin** — Full system access. Manages schedules, locations, player registrations, payment verification.
- **Facilitator** — Game-day operations. Manages attendance (QR scanner), team lineups, game logistics.
- **Player** — Self-service registration. Can register for games, view schedules, manage profile.

**Key entities:**
- **Schedule** — A scheduled volleyball game with date, location, max players, price. Tracks registrations and payment status.
- **Location** — Physical venue for games. Can host multiple schedules.
- **Registration** — Single player or group registration for a schedule. Links player(s) to schedule, tracks payment.
- **User** — Supabase auth user extended with profile (name, role, phone, etc.) in the `users` table.

**Payment tracking** — Registrations track payment status (pending, verified, failed). Admin can verify payments via the payment verification page.

**QR attendance** — Facilitator scans player QR codes at game start to mark attendance. Attendance data stored per-schedule per-player.

## Workflow

**When adding a new feature:**
1. Use `nextjs-supabase-architect` for full-stack work (API routes, database queries, auth flows)
2. Use `frontend-ui-crafter` for UI/pages/components
3. Use `senior-code-reviewer` after significant code changes
4. Always write unit tests (use `unit-test-engineer` agent)
5. Update `/docs/CODEBASE.md` (technical) and `/docs/FUNCTIONAL.md` (stakeholder-facing) with feature details
6. Add test cases to Notion (`Game Reservation Tests` database) — see [TEST_PLAN_SYNC.md](docs/TEST_PLAN_SYNC.md) for workflow
7. Add a row to the Feature Log table in both docs

## Rules & Standards

Core rules files (read before writing any code):
- [`.claude/rules/code-quality.md`](.claude/rules/code-quality.md) — Code standards, UI conventions, forms, animations, and development mindset
- [`.claude/rules/frontend.md`](.claude/rules/frontend.md) — Design tokens (CSS custom properties), dark mode, layout standards, component composition, accessibility, and performance
- [`.claude/rules/supabase.md`](.claude/rules/supabase.md) — Client selection (createClient vs createServiceClient), RLS, result handling, auth session management
- [`.claude/rules/nextjs.md`](.claude/rules/nextjs.md) — Server vs Client Components, data fetching strategy, API route structure, middleware scope, cache behavior
- [`.claude/rules/security.md`](.claude/rules/security.md) — Input validation, authentication, secrets management, and data protection
- [`.claude/rules/testing.md`](.claude/rules/testing.md) — Testing stack, file conventions, mock helpers, unit vs integration, coverage thresholds (alwaysApply)
- [`.claude/rules/error-handling.md`](.claude/rules/error-handling.md) — Error classification, logging, promise handling, and API responses
- [`.claude/rules/database.md`](.claude/rules/database.md) — Migration safety, schema design, reversibility, and data management
- [`.claude/rules/code-review.md`](.claude/rules/code-review.md) — When to run senior-code-reviewer, what it checks, and how to act on findings

## Test Plans & Quality Assurance

Test plans are maintained in **Notion** for visibility and traceability:
- **Database:** [Game Reservation Tests](https://www.notion.so/33289f8b28e4807c96f9e75cb23a87c3)
- **Process:** [TEST_PLAN_SYNC.md](docs/TEST_PLAN_SYNC.md) — How to keep test plans in sync with feature development
- Covers 12+ implemented features with 100+ test cases across E2E, Unit, and Integration tests
- Test status tracked by feature (Ready, In Progress, Deferred, Blocked)
