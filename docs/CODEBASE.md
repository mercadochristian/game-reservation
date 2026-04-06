# Codebase Reference

> Technical reference for developers. For stakeholder-facing feature overview, see [FUNCTIONAL.md](FUNCTIONAL.md).

**Last Updated:** 2026-04-06

---

## System Overview

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI Library | React 19 + TypeScript 5 |
| Styling | Tailwind CSS v4 (class-based dark mode via `.dark`) |
| Animation | Framer Motion v12 |
| Forms | React Hook Form + Zod |
| Headless UI | `@base-ui/react` (unstyled accessible primitives) |
| Backend | Supabase (PostgreSQL + email/password auth via `@supabase/ssr`) |
| Notifications | Sonner |
| Unit Testing | Vitest 4.x + Testing Library + jsdom |
| E2E Testing | Playwright |

### Directory Structure

```
src/
├── app/
│   ├── page.tsx                          # Public landing page
│   ├── auth/page.tsx                     # Sign in / sign up (email + password)
│   ├── create-profile/page.tsx           # New user onboarding (profile completion)
│   ├── waiver/page.tsx                   # Waiver agreement (required before registration)
│   ├── register/[scheduleId]/page.tsx    # Player self-registration for a game
│   ├── dashboard/
│   │   ├── page.tsx                      # Role-aware dashboard home
│   │   ├── scanner/page.tsx              # QR code attendance scanner (admin/facilitator)
│   │   ├── registrations/page.tsx        # All registrations by location (admin/facilitator)
│   │   ├── schedules/page.tsx            # Schedule management (admin)
│   │   ├── users/page.tsx                # User management with ban/unban (admin)
│   │   ├── payments/page.tsx             # Payment verification (admin)
│   │   ├── payment-channels/page.tsx     # Payment method management (admin)
│   │   ├── lineups/[scheduleId]/page.tsx # Drag-and-drop lineup builder (admin/facilitator)
│   │   ├── locations/page.tsx            # Location management (admin)
│   │   ├── logs/page.tsx                 # Error/activity logs (super_admin only)
│   │   ├── mvp/page.tsx                  # MVP awards (facilitator)
│   │   ├── teams/page.tsx                # Team management (facilitator)
│   │   ├── profile/page.tsx              # Profile editing (all roles)
│   │   ├── register/page.tsx             # Admin player registration dialog
│   │   └── my-registrations/page.tsx     # Player registration history
│   └── api/
│       ├── admin/
│       │   ├── lineups/route.ts
│       │   ├── locations/route.ts
│       │   ├── payment-channels/route.ts
│       │   ├── payment-channels/upload-qr/route.ts
│       │   ├── payments/route.ts
│       │   ├── payments/[id]/route.ts
│       │   ├── payments/[id]/edit/route.ts
│       │   ├── payments/schedules/route.ts
│       │   ├── register/route.ts
│       │   ├── registrations/route.ts
│       │   ├── registrations/[scheduleId]/route.ts
│       │   └── schedules/route.ts
│       ├── logs/error/route.ts
│       ├── payment-channels/route.ts
│       ├── payment-proof/extract/route.ts
│       ├── profile/complete/route.ts
│       ├── profile/edit/route.ts
│       ├── register/group/route.ts
│       ├── registrations/by-position/route.ts
│       ├── registrations/counts/route.ts
│       ├── scanner/scan/route.ts
│       ├── scanner/schedules/route.ts
│       ├── scanner/schedules/[scheduleId]/players/route.ts
│       └── users/
│           ├── [userId]/route.ts
│           ├── [userId]/ban/route.ts
│           ├── [userId]/unban/route.ts
│           └── search/route.ts
├── components/
│   ├── app-shell.tsx                     # Universal nav wrapper (role-based)
│   ├── admin-nav.tsx
│   ├── confirm-delete-dialog.tsx
│   ├── dashboard-header.tsx
│   ├── error-boundary.tsx
│   ├── featured-game-card.tsx
│   ├── featured-games-section.tsx
│   ├── filter-accordion.tsx
│   ├── floating-home-button.tsx
│   ├── footer.tsx
│   ├── game-filter.tsx
│   ├── hero-section.tsx
│   ├── login-modal.tsx
│   ├── payment-channels-modal.tsx
│   ├── position-modal.tsx
│   ├── public-calendar.tsx
│   ├── public-nav.tsx
│   ├── qr-code-modal.tsx
│   ├── qr-modal.tsx
│   ├── registered-game-card.tsx
│   ├── registered-games-section.tsx
│   ├── schedule-info.tsx
│   ├── dashboard/                        # Dashboard-specific feature components
│   ├── navigation/                       # Nav modal and navigation components
│   ├── payments/                         # Payment-related components
│   ├── registrations/                    # Registrations-related components
│   └── ui/                               # Styled UI primitives (shadcn-style)
│       ├── alert.tsx, badge.tsx, button.tsx, card.tsx
│       ├── dialog.tsx, dropdown-menu.tsx, input.tsx, label.tsx
│       ├── navigation-menu.tsx, page-header.tsx, pagination.tsx
│       ├── select.tsx, sonner.tsx, table-skeleton.tsx, table.tsx, tabs.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     # Browser client (RLS-respecting, anon key)
│   │   ├── server.ts                     # Server client (cookie-based session, RLS-respecting)
│   │   ├── service.ts                    # Service client (bypasses RLS, server-only)
│   │   └── middleware.ts                 # Session refresh helper for middleware
│   ├── config/
│   │   ├── branding.ts                   # Loads branding.json
│   │   └── navigation.ts                 # NAVIGATION_CONFIG + getNavByRole()
│   ├── context/
│   │   └── user-context.tsx              # UserContext + useUser() hook
│   ├── queries/                          # Centralized DB query functions (by table)
│   │   ├── index.ts                      # Re-exports all query modules
│   │   ├── users.ts, schedules.ts, registrations.ts
│   │   ├── payments.ts, teams.ts, payment-channels.ts
│   ├── hooks/                            # Custom React hooks
│   │   ├── useCrudDialog.ts, useCurrentUser.ts, useHasAnimated.ts
│   │   ├── usePagination.ts, usePaymentsByLocation.ts
│   │   ├── useSchedulePlayers.ts, useSchedulesByLocation.ts, useSchedulesForScanner.ts
│   ├── validations/                      # Zod schemas
│   │   ├── admin-registration.ts, auth.ts, group-registration.ts
│   │   ├── lineup.ts, location.ts, payment-channel.ts, payment-edit.ts
│   │   ├── profile-edit.ts, profile.ts, scanner.ts, schedule.ts
│   │   ├── user-edit.ts, user-search.ts
│   ├── constants/                        # Shared label maps and constants
│   ├── services/                         # Domain service functions (e.g., guest-user)
│   ├── utils/                            # Pure utility functions (e.g., pricing)
│   └── logger.ts                         # logActivity, logError, logWarn
├── types/
│   └── database.ts                       # Generated Supabase types (do not edit manually)
└── middleware.ts                          # Auth, role guards, rate limiting, ban enforcement

docs/
├── CODEBASE.md                           # This file — technical reference
├── FUNCTIONAL.md                         # Stakeholder feature guide
├── SECURITY.md                           # Security architecture
├── TESTING.md                            # Testing strategy and patterns
├── STYLE_GUIDE.md                        # Design system and tokens
├── playwright-guide.md                   # E2E testing guide
├── TEST_PLAN_SYNC.md                     # Notion test plan workflow
├── future-features.md                    # Planned features backlog
├── setup/                                # Setup and deployment guides
├── architecture/                         # Architecture decision records
└── database/                             # Migration strategy docs
```

---

## Auth Flow

Implemented in `src/middleware.ts`. Every request passes through these checks in order:

1. **Rate limiting** — Sensitive API prefixes (`/api/register/`, `/api/admin/register`, `/api/payment-proof/`) are rate-limited with an in-memory sliding window before any DB work.

2. **Session refresh** — `updateSession()` is always called first to keep Supabase session cookies fresh.

3. **Static assets** — `/_next`, `/favicon` pass through immediately.

4. **Public routes** — `PUBLIC_ROUTES` array:
   - `/auth`, `/auth/callback`, `/`, `/waiver`
   - `/api/registrations/counts`, `/api/registrations/by-position`

   Unauthenticated users on public routes pass through. Authenticated users visiting `/auth` redirect to `/dashboard` (or the `returnUrl` query parameter if valid).

5. **Unauthenticated user on protected route** — redirect to `/auth?returnUrl=<path>`.

6. **Profile check** — After confirming auth, middleware fetches `role`, `profile_completed`, and `banned_at` from the `users` table.
   - `PROFILE_CHECK_EXEMPT`: `/api/profile/complete`, `/create-profile` (prevents redirect loop)
   - Incomplete profile (`profile_completed !== true`) → redirect to `/create-profile?returnUrl=<path>`

7. **Banned user** — `banned_at` is non-null → redirect to `/auth?error=banned` (except when already on `/auth`).

8. **Role-protected pages** — `ROLE_PROTECTED_PAGES` map:

   | Path | Allowed Roles |
   |------|--------------|
   | `/dashboard/users` | admin, super_admin |
   | `/dashboard/registrations` | admin, super_admin |
   | `/dashboard/payments` | admin, super_admin |
   | `/dashboard/schedules` | admin, super_admin |
   | `/dashboard/locations` | admin, super_admin |
   | `/dashboard/payment-channels` | admin, super_admin |
   | `/dashboard/logs` | super_admin |
   | `/dashboard/lineups` | admin, super_admin |
   | `/dashboard/scanner` | admin, super_admin, facilitator |

   Paths not listed here are accessible to all authenticated users with a completed profile (e.g., `/dashboard/profile`, `/dashboard/my-registrations`).

9. **Fail closed** — Any unhandled exception in middleware redirects to `/auth?error=service_unavailable` (never passes through).

---

## Database Schema

All types come from `src/types/database.ts` (generated from Supabase; do not edit manually).

### Enums

| Enum | Values |
|------|--------|
| `user_role` | `admin`, `player`, `facilitator`, `super_admin` |
| `skill_level` | `developmental`, `developmental_plus`, `intermediate`, `intermediate_plus`, `advanced` |
| `player_position` | `open_spiker`, `opposite_spiker`, `middle_blocker`, `setter`, `middle_setter` |
| `team_preference` | `shuffle`, `group`, `team` |
| `schedule_status` | `open`, `full`, `cancelled`, `completed` |
| `payment_status` | `pending`, `review`, `paid`, `rejected` |

### Tables

#### `users`
Extends Supabase auth users with profile data.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Matches `auth.users.id` |
| `email` | string | |
| `first_name` | string \| null | |
| `last_name` | string \| null | |
| `role` | user_role | Default: `player` |
| `skill_level` | skill_level \| null | |
| `player_contact_number` | string \| null | |
| `gender` | string \| null | |
| `birthday_day/month/year` | number \| null | |
| `emergency_contact_name` | string \| null | |
| `emergency_contact_number` | string \| null | |
| `emergency_contact_relationship` | string \| null | |
| `avatar_url` | string \| null | |
| `profile_completed` | boolean | Required to access dashboard |
| `is_guest` | boolean | Guest users created by group/team registration |
| `banned_at` | string \| null | Non-null = banned; enforced by middleware |
| `created_at` / `updated_at` | string | |

#### `locations`
Physical venues for games.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `name` | string | |
| `address` | string \| null | |
| `google_map_url` | string \| null | |
| `notes` | string \| null | |
| `is_active` | boolean | |
| `created_by` | uuid | FK → users |
| `deleted_at` | string \| null | Soft delete |
| `created_at` / `updated_at` | string | |

#### `schedules`
A game session at a location.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `location_id` | uuid | FK → locations |
| `start_time` / `end_time` | string | ISO timestamps |
| `status` | schedule_status | open, full, cancelled, completed |
| `max_players` | number | |
| `num_teams` | number | Default: 2 |
| `position_prices` | JSON | Per-position pricing map |
| `team_price` | number \| null | Price for team mode |
| `required_levels` | string[] \| null | Skill level restrictions |
| `discount_type` | string \| null | |
| `discount_value` | number \| null | |
| `created_by` | uuid | FK → users |
| `deleted_at` | string \| null | Soft delete |
| `created_at` / `updated_at` | string | |

#### `registrations`
A single player's registration for a schedule.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `player_id` | uuid | FK → users |
| `schedule_id` | uuid | FK → schedules |
| `registered_by` | uuid | FK → users (admin or player who registered) |
| `team_preference` | team_preference | shuffle, group, team |
| `preferred_position` | player_position \| null | |
| `qr_token` | string \| null | Unique token for QR code |
| `attended` | boolean | Marked by QR scanner |
| `lineup_team_id` | uuid \| null | FK → teams (assigned after lineup) |
| `registration_note` | string \| null | Player-supplied note (write-once, max 200 chars) |
| `created_at` / `updated_at` | string | |

#### `registration_payments`
Payment record for a registration or team registration.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `payer_id` | uuid | FK → users |
| `registration_id` | uuid \| null | FK → registrations (null for team payments) |
| `team_id` | uuid \| null | FK → teams (for team registrations) |
| `schedule_id` | uuid | FK → schedules |
| `payment_status` | string | pending, review, paid, rejected |
| `payment_proof_url` | string \| null | Storage URL |
| `payment_channel_id` | uuid \| null | FK → payment_channels |
| `required_amount` | number | |
| `extracted_amount` | number \| null | AI-extracted from proof image |
| `extracted_reference` | string \| null | |
| `extracted_sender` | string \| null | |
| `extracted_datetime` | string \| null | |
| `extraction_confidence` | string \| null | |
| `extraction_status` | string \| null | |
| `extracted_raw` | JSON \| null | Raw AI extraction result |
| `payment_note` | string \| null | Admin note (editable, max 200 chars) |
| `registration_type` | string | solo, group, team |
| `created_at` / `updated_at` | string | |

#### `teams`
A lineup team for a schedule.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `schedule_id` | uuid | FK → schedules |
| `name` | string | |
| `team_type` | string | Default: group |
| `created_at` | string | |

#### `team_members`
Players assigned to a team.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `team_id` | uuid | FK → teams |
| `player_id` | uuid | FK → users |
| `registration_id` | uuid | FK → registrations |
| `position` | player_position \| null | |

#### `payment_channels`
Admin-configured payment methods shown to players during registration.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `name` | string | Display name |
| `provider` | string | GCash, Maya, BDO, etc. |
| `account_number` | string | |
| `account_holder_name` | string | |
| `qr_code_url` | string \| null | Optional QR code image |
| `is_active` | boolean | |
| `created_by` | uuid | FK → users |
| `created_at` / `updated_at` | string | |

#### `mvp_awards`
Post-game MVP recognition.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `player_id` | uuid | FK → users |
| `schedule_id` | uuid | FK → schedules |
| `awarded_by` | uuid | FK → users (facilitator) |
| `note` | string \| null | |
| `awarded_at` | string | |

#### `logs`
Audit log for system events.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `level` | string | info, warn, error |
| `action` | string | Dot-namespaced event name |
| `user_id` | uuid \| null | FK → users |
| `message` | string \| null | |
| `metadata` | JSON \| null | Structured context |
| `created_at` | string | |

#### `role_whitelist`
Pre-approved email addresses with a specific role assignment.

| Column | Type |
|--------|------|
| `email` | string |
| `role` | user_role |

### Views

#### `locations_archive`
Read-only view of all locations including soft-deleted ones. Used to preserve schedule references after a location is archived.

### Postgres Functions (RPCs)

| Function | Description |
|----------|-------------|
| `register_group_transaction(p_payment, p_registrations, p_schedule_id, p_team, p_team_members)` | Atomic group/team registration — inserts team, team_members, registrations, and payment in a single transaction. Enforces slot limits at DB level to prevent race conditions. |

---

## API Routes

| Method | Path | Role Required | Description |
|--------|------|---------------|-------------|
| POST | `/api/profile/complete` | Authenticated | Complete new user profile after signup |
| PATCH | `/api/profile/edit` | Authenticated | Update own profile |
| POST | `/api/register/group` | Authenticated | Self-register solo/group/team for a schedule |
| GET | `/api/registrations/counts` | Public | Registration counts by position for a schedule |
| GET | `/api/registrations/by-position` | Public | Player names per position for a schedule |
| GET | `/api/payment-channels` | Authenticated | List active payment channels |
| POST | `/api/payment-proof/extract` | Authenticated | AI extraction of payment amount/reference from proof image |
| GET | `/api/admin/schedules` | admin, super_admin | List schedules with registration counts |
| POST | `/api/admin/schedules` | admin, super_admin | Create a new schedule |
| PATCH/DELETE | `/api/admin/schedules` | admin, super_admin | Update or soft-delete a schedule |
| GET/POST/PATCH/DELETE | `/api/admin/locations` | admin, super_admin | CRUD for game locations |
| GET | `/api/admin/registrations` | admin, super_admin | List all registrations (filtered by location/schedule) |
| GET | `/api/admin/registrations/[scheduleId]` | admin, super_admin | Registrations for a specific schedule |
| POST | `/api/admin/register` | admin, super_admin | Register a player on behalf of another user |
| GET/PATCH/DELETE | `/api/admin/payments` | admin, super_admin | List and manage payment records |
| GET | `/api/admin/payments/[id]` | admin, super_admin | Get single payment record |
| PATCH | `/api/admin/payments/[id]/edit` | admin, super_admin | Edit payment details (amount, reference, note) |
| GET | `/api/admin/payments/schedules` | admin, super_admin | List schedules for payment filter dropdown |
| GET/POST/PATCH/DELETE | `/api/admin/payment-channels` | admin, super_admin | CRUD for payment channels |
| POST | `/api/admin/payment-channels/upload-qr` | admin, super_admin | Upload QR code image for a payment channel |
| POST | `/api/admin/lineups` | admin, super_admin | Save lineup team assignments for a schedule |
| POST | `/api/logs/error` | super_admin | Log a client-side error event |
| POST | `/api/scanner/scan` | admin, super_admin, facilitator | Mark attendance by scanning a QR token |
| GET | `/api/scanner/schedules` | admin, super_admin, facilitator | List schedules available for scanning |
| GET | `/api/scanner/schedules/[scheduleId]/players` | admin, super_admin, facilitator | List players for a schedule with attendance status |
| GET | `/api/users/[userId]` | admin, super_admin | Get a single user's profile |
| PATCH | `/api/users/[userId]/ban` | admin, super_admin | Ban a user (set `banned_at` timestamp) |
| PATCH | `/api/users/[userId]/unban` | admin, super_admin | Unban a user (clear `banned_at`) |
| GET | `/api/users/search` | admin, super_admin, facilitator | Search users by name or email |

---

## Pages & Routes

| Path | Role(s) | Status | Description |
|------|---------|--------|-------------|
| `/` | Public | Live | Landing page with public game calendar |
| `/auth` | Public | Live | Email/password sign in and sign up |
| `/create-profile` | Authenticated (incomplete profile) | Live | New user profile setup |
| `/waiver` | Public | Live | Waiver agreement (required before registration) |
| `/register/[scheduleId]` | Authenticated | Live | Player self-registers for a game |
| `/dashboard` | All roles | Live | Role-aware dashboard home |
| `/dashboard/profile` | All roles | Live | Edit own profile |
| `/dashboard/my-registrations` | All roles | Live | Registration history with QR codes |
| `/dashboard/scanner` | admin, super_admin, facilitator | Live | QR code attendance scanner |
| `/dashboard/registrations` | admin, super_admin | Live | All registrations filtered by location |
| `/dashboard/schedules` | admin, super_admin | Live | Create/edit/delete game schedules |
| `/dashboard/locations` | admin, super_admin | Live | Manage game venues |
| `/dashboard/payments` | admin, super_admin | Live | Verify/reject player payments |
| `/dashboard/payment-channels` | admin, super_admin | Live | Manage accepted payment methods |
| `/dashboard/lineups/[scheduleId]` | admin, super_admin | Live | Drag-and-drop lineup builder |
| `/dashboard/users` | admin, super_admin | Live | User list with ban/unban actions |
| `/dashboard/register` | admin, super_admin | Live | Admin registers a player for a game |
| `/dashboard/logs` | super_admin | Live | System error/activity log viewer |
| `/dashboard/mvp` | facilitator | Live (nav disabled) | MVP award management |
| `/dashboard/teams` | facilitator | Live (nav disabled) | Team management |

---

## Components

### Shell & Navigation
- `app-shell.tsx` — Universal layout wrapper. Mobile: fixed 64px top bar + hamburger drawer. Desktop: fixed 256px left sidebar. Renders role-based nav from `NAVIGATION_CONFIG` in `src/lib/config/navigation.ts`.
- `navigation/nav-modal.tsx` — Mobile hamburger navigation drawer.

### Dashboard Components
- `dashboard/` — Dashboard-specific feature components (schedule cards, registration tables, payment views, lineup builder UI).
- `dashboard-header.tsx` — Reusable page header with title and action button slot.
- `registrations/` — Components for the registrations dashboard (player cards, registration table rows, admin registration dialog).
- `payments/` — Payment record components, proof viewer, AI extraction status display.

### Public-Facing Components
- `public-calendar.tsx` — Interactive game calendar on the landing page with live position counts.
- `public-nav.tsx` — Navigation for unauthenticated visitors.
- `hero-section.tsx` — Landing page hero section.
- `featured-games-section.tsx` / `featured-game-card.tsx` — Highlighted upcoming games.
- `registered-games-section.tsx` / `registered-game-card.tsx` — Player's registered games on dashboard home.

### Utility Components
- `confirm-delete-dialog.tsx` — Reusable confirmation dialog for destructive actions.
- `error-boundary.tsx` — React error boundary for dashboard route segments.
- `filter-accordion.tsx` — Collapsible filter panel with active-filter count badge.
- `qr-code-modal.tsx` / `qr-modal.tsx` — QR code display modals for players.
- `payment-channels-modal.tsx` — Payment channel selector during registration.
- `position-modal.tsx` — Position availability details panel on public calendar.
- `floating-home-button.tsx` — Back-to-home floating button for non-dashboard pages.

### UI Primitives (`src/components/ui/`)
Custom shadcn-style components built on `@base-ui/react`: `Button`, `Card`, `Badge`, `Input`, `Label`, `Select`, `Dialog`, `Tabs`, `Table`, `Pagination`, `Alert`, `DropdownMenu`, `NavigationMenu`, `PageHeader`, `TableSkeleton`, `Sonner`.

---

## Lib Utilities

### Supabase Clients (`src/lib/supabase/`)

| Client | Import | When to Use |
|--------|--------|-------------|
| `createClient()` (server) | `@/lib/supabase/server` | `page.tsx`, `layout.tsx`, API route identity checks. Cookie-based session, respects RLS. |
| `createClient()` (browser) | `@/lib/supabase/client` | Client Components (`'use client'`). Anon key, respects RLS. |
| `createServiceClient()` | `@/lib/supabase/service` | Server-only. Admin writes, operations on behalf of other users. Bypasses RLS. Never import in Client Components. |

Standard two-client pattern for API routes: use `createClient()` to authenticate the caller, then `createServiceClient()` for the privileged operation.

### Query Functions (`src/lib/queries/`)

All DB queries must live here. Never write inline Supabase queries in pages, API routes, or components.

| File | Covers |
|------|--------|
| `users.ts` | User lookup, role fetch, profile queries |
| `schedules.ts` | Schedule fetch with location join, status filtering |
| `registrations.ts` | Registration fetch by player/schedule, duplicate checks |
| `payments.ts` | Payment record fetch, status updates |
| `teams.ts` | Team and team_member queries |
| `payment-channels.ts` | Active payment channel listing |
| `index.ts` | Re-exports all modules |

### Hooks (`src/lib/hooks/`)

| Hook | Purpose |
|------|---------|
| `useCrudDialog` | Generic open/close/entity state for CRUD dialogs |
| `useCurrentUser` | Access the current authenticated user's profile |
| `useHasAnimated` | Track whether a component has completed its entrance animation |
| `usePagination` | Client-side pagination state (page, pageSize, totalPages) |
| `usePaymentsByLocation` | Fetch payments filtered by location |
| `useSchedulePlayers` | Fetch registered players for a schedule |
| `useSchedulesByLocation` | Fetch schedules at a given location with refetch support |
| `useSchedulesForScanner` | Fetch today's schedules for the QR scanner |

### Validation Schemas (`src/lib/validations/`)

| File | Validates |
|------|-----------|
| `auth.ts` | Login and signup form inputs |
| `profile.ts` | New user onboarding form (name, birthday, skill level, contacts) |
| `profile-edit.ts` | Profile edit form |
| `group-registration.ts` | Group/team registration — player entries and position assignments |
| `admin-registration.ts` | Admin-initiated registration on behalf of a player |
| `schedule.ts` | Schedule create/edit form |
| `location.ts` | Location create/edit form |
| `lineup.ts` | Lineup save payload (schedule_id + teams array) |
| `payment-channel.ts` | Payment channel create/edit |
| `payment-edit.ts` | Admin payment correction (amount, reference, note) |
| `scanner.ts` | QR scan payload (`qr_token`) |
| `user-edit.ts` | Admin user edit (role, skill level) |
| `user-search.ts` | Search query parameter sanitization |

### Logger (`src/lib/logger.ts`)

All server-side logging goes to the `logs` table via `createServiceClient()`. Logging failures fall back to `console.error` without re-throwing.

```ts
// Log a user action (info level)
await logActivity(action: string, userId: string, metadata?: Record<string, unknown>)

// Log a warning
await logWarn(action: string, message: string, userId?: string | null, metadata?: Record<string, unknown>)

// Log an error (accepts Error or unknown — extracts message and stack)
await logError(action: string, error: unknown, userId?: string | null, metadata?: Record<string, unknown>)
```

Never use `console.log` in committed code. Use `logActivity`, `logError`, or `logWarn`.

---

## Feature Log

| Date | Feature | Key Files | Status |
|------|---------|-----------|--------|
| 2026-04-06 | E2E Playwright Infrastructure | `playwright.config.ts`, `tests/e2e/`, `docs/playwright-guide.md` | Live |
| 2026-04-03 | User Management Redesign (filter chips, type badges) | `src/app/dashboard/users/` | Live |
| 2026-04-03 | Ban/Unban Users | `src/app/api/users/[userId]/ban/route.ts`, `src/app/api/users/[userId]/unban/route.ts`, `src/middleware.ts` | Live |
| 2026-04-03 | Banned account message on auth page | `src/app/auth/` | Live |
| 2026-04-02 | Admin Registration Dialog | `src/components/registrations/`, `src/app/api/admin/register/route.ts` | Live |
| 2026-04-01 | Registration & Payment Notes | `src/lib/validations/`, `src/app/api/admin/payments/` | Live |
| 2026-03-29 | Registrations Dashboard (merged view) | `src/app/dashboard/registrations/`, `src/app/api/admin/registrations/` | Live |
| 2026-03-29 | QR Code Attendance Scanner | `src/app/dashboard/scanner/`, `src/app/api/scanner/` | Live |
| 2026-03-28 | My Registrations (Player View) | `src/app/dashboard/my-registrations/` | Live |
| 2026-03-26 | Profile Page | `src/app/dashboard/profile/`, `src/app/api/profile/edit/` | Live |
| 2026-03-26 | Lineup Builder (drag-and-drop) | `src/app/dashboard/lineups/[scheduleId]/`, `src/app/api/admin/lineups/` | Live |
| 2026-03-20 | Sliding-Window Rate Limiting | `src/middleware.ts` | Live |
| 2026-03-19 | Atomic Group Registration (Postgres RPC) | `src/app/api/register/group/route.ts`, DB function `register_group_transaction` | Live |
| 2026-03-19 | Real-Time Position Availability | `src/app/api/registrations/counts/`, `src/app/api/registrations/by-position/` | Live |
| 2026-03-18 | Waiver Page | `src/app/waiver/` | Live |
| 2026-03-18 | User Auth & Profile Onboarding | `src/app/auth/`, `src/app/create-profile/`, `src/middleware.ts` | Live |
| 2026-03-18 | Game Schedule Management | `src/app/dashboard/schedules/`, `src/app/api/admin/schedules/` | Live |
| 2026-03-18 | Location Management | `src/app/dashboard/locations/`, `src/app/api/admin/locations/` | Live |
| 2026-03-18 | Game Registration (Solo/Group/Team) | `src/app/register/[scheduleId]/`, `src/app/api/register/group/` | Live |
| 2026-03-18 | Payment Tracking & Verification | `src/app/dashboard/payments/`, `src/app/api/admin/payments/` | Live |
| 2026-03-18 | Payment Channels Management | `src/app/dashboard/payment-channels/`, `src/app/api/admin/payment-channels/` | Live |
| 2026-03-18 | Public Game Calendar | `src/app/page.tsx`, `src/components/public-calendar.tsx` | Live |
| 2026-03-18 | Activity Logs | `src/app/dashboard/logs/`, `src/lib/logger.ts` | Live |
| 2026-03-18 | Safe Delete (Locations & Schedules) | DB migrations, `deleted_at` soft-delete pattern | Live |
| 2026-03-18 | Centralized Query Library | `src/lib/queries/` | Live |
