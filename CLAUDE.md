# Volleyball Game Reservation System

A full-stack web application for managing volleyball game reservations, player registrations, and administrative operations. Supports three user roles: **Admin** (schedules, payments, registrations), **Facilitator** (game-day ops, QR attendance, team management), and **Player** (registration, profile).

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Architecture

**Tech**: Next.js 15 (app router) + React 19 + TypeScript 5. Styling with Tailwind v4, animations with Framer Motion v12. Forms via React Hook Form + Zod. Backend is Supabase (PostgreSQL + Auth via magic link).

**Directory structure:**
- `src/app/` — Role-based pages and layouts (`admin/`, `player/`, `facilitator/`, `auth/`, `create-profile/`, `api/profile/complete/`)
- `src/components/` — UI primitives (custom shadcn-style on `@base-ui/react`) and `app-shell.tsx` (universal nav)
- `src/lib/` — Supabase clients (browser + server), branding config, Zod validation schemas, typed exports from `src/types/`
- `/docs/` — `CODEBASE.md` (technical reference) and `FUNCTIONAL.md` (stakeholder reference)

**Auth flow** enforced by middleware (`src/middleware.ts`):
1. Unauthenticated → `/auth` (magic link)
2. Authenticated + no profile → `/create-profile` (players only)
3. Authenticated + profile complete → role dashboard (`/admin`, `/facilitator`, `/player`)

**Layouts**: `AppShell` wraps all role dashboards. Mobile (<1024px) uses fixed top bar (64px) with hamburger drawer; desktop (≥1024px) uses fixed left sidebar (256px).

## Key Decisions

**Light mode default** — No forced `.dark` class; respects system/browser preferences.

**Magic link auth** — Supabase auth via `@supabase/ssr` middleware. Use `createClient()` for browser context, `createServiceClient()` for server-side operations.

**Framer Motion animation pattern** — All staggered animations use a consistent `fadeUpVariants` object with `custom` prop for delay control. Ensures visual consistency across the app.

**Headless UI + custom primitives** — Using `@base-ui/react` (unstyled, accessible) rather than pre-styled components. Gives us full design control while maintaining accessibility standards.

**Role-based nav in AppShell** — Nav items are defined per role in a single `NAV_ITEMS` object in `src/components/app-shell.tsx`. Supports "coming soon" items (opacity-faded, disabled). Single source of truth for navigation structure.

**Branding via config file** — `branding.json` at project root is loaded via `src/lib/config/branding.ts`. Allows rebranding without code changes.

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
6. Add a row to the Feature Log table in both docs

## Rules & Standards

Core rules files:
- [`.claude/rules/code-quality.md`](.claude/rules/code-quality.md) — Code standards, UI conventions, forms, animations, and development mindset
- [`.claude/rules/frontend.md`](.claude/rules/frontend.md) — Frontend design tokens, layout standards, accessibility, and performance
- [`.claude/rules/security.md`](.claude/rules/security.md) — Input validation, authentication, secrets management, and data protection
- [`.claude/rules/testing.md`](.claude/rules/testing.md) — Testing principles, mocking strategies, test structure, and coverage expectations
- [`.claude/rules/error-handling.md`](.claude/rules/error-handling.md) — Error classification, logging, promise handling, and API responses
- [`.claude/rules/database.md`](.claude/rules/database.md) — Migration safety, schema design, reversibility, and data management
