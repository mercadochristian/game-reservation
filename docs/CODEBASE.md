# Codebase Technical Reference — Volleyball Game Reservation System

> For developers: comprehensive reference covering system architecture, database schema, API routes, pages, components, and code patterns.
>
> For updating: whenever a new feature is implemented, add a line to the Feature Log at the end of this document.

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Auth Flow](#auth-flow)
3. [Database Schema](#database-schema)
4. [API Routes](#api-routes)
5. [Pages & Routes](#pages--routes)
6. [Components](#components)
7. [UI Primitives](#ui-primitives)
8. [Lib Utilities](#lib-utilities)
9. [Validation Schemas](#validation-schemas)
10. [Types](#types)
11. [Testing](#testing)
12. [Feature Log](#feature-log)

---

## System Overview

**Purpose:** Web application for managing volleyball game reservations, player registrations, and game-day operations.

**Tech Stack:**
- Frontend: Next.js 15 (App Router), React 19, TypeScript 5
- Styling: Tailwind CSS v4, Framer Motion v12 (animations)
- Forms: React Hook Form + Zod (validation)
- Backend: Supabase (PostgreSQL + Auth)
- UI: Custom shadcn-style primitives on `@base-ui/react`
- Notifications: Sonner (toast library)
- Icons: Lucide React
- QR Codes: react-qr-code

**Key Architecture:**
- Middleware (`src/middleware.ts`) enforces role-based route guards
- Email/password authentication via Supabase Auth (sign in + sign up on same page)
- Three user roles: Admin, Facilitator, Player
- Database triggers auto-create `public.users` rows on auth signup
- Row-level security (RLS) protects all tables
- `AppShell` component provides responsive nav (mobile drawer / desktop sidebar)

**Timezone:** Asia/Manila (UTC+8) — all times stored with offset, displayed in local time

---

## Auth Flow

### 1. Middleware Session Refresh
**File:** `src/middleware.ts` → calls `updateSession()` from `src/lib/supabase/middleware.ts`

On every request:
- `createServerClient` reads request cookies
- Calls `supabase.auth.getUser()` — this refreshes the session JWT
- Writes updated cookies to response
- Returns `{ supabaseResponse, user, supabase }`

### 2. Route Guard Logic
**File:** `src/middleware.ts`

```
Static asset? → pass through
No user + not public route? → redirect to /auth
User + on /auth? → check profile_completed
  - player + no profile → /create-profile
  - everyone else → /dashboard (role-resolved)
User + on protected route? → check role + profile
  - player + no profile → /create-profile
  - on wrong-role path (e.g. /admin/* as player) → /dashboard
Otherwise → pass through
```

Public routes allowed: `/`, `/auth`, `/auth/callback`

Role-to-path mapping: `admin → /admin`, `facilitator → /facilitator`, `player → /player`

### 3. Auth Page (`/auth`)
**File:** `src/app/auth/page.tsx`

Client component. Email/password form with sign in and sign up modes:
- Sign In: `supabase.auth.signInWithPassword({ email, password })`
- Sign Up: `supabase.auth.signUp({ email, password })` → auto-logs in if confirmed
- Reads `?returnUrl` param to redirect after auth
- Uses `getAuthErrorMessage()` to humanize Supabase errors
- Toggle between "Sign In" and "Create Account" modes

### 4. Auth Callback (`/auth/callback`) — Deprecated
**File:** `src/app/auth/callback/route.ts`

Previously used for magic link email confirmation. No longer in use with password-based auth.

### 5. Supabase Client Selection

| Context | Client | File |
|---|---|---|
| Browser (client component) | `createClient()` | `src/lib/supabase/client.ts` |
| Server component / Route handler | `await createClient()` | `src/lib/supabase/server.ts` |
| Bypass RLS (server-only) | `createServiceClient()` | `src/lib/supabase/service.ts` |
| Middleware | `createServerClient` | `src/lib/supabase/middleware.ts` |

---

## Database Schema

### Enums

| Enum | Values |
|---|---|
| `user_role` | `admin`, `player`, `facilitator` |
| `skill_level` | `developmental`, `developmental_plus`, `intermediate`, `intermediate_plus`, `advanced` |
| `schedule_status` | `open`, `full`, `cancelled`, `completed` |
| `payment_status` | `pending`, `review`, `paid`, `rejected` |
| `team_preference` | `shuffle`, `group`, `team` |
| `player_position` | `open_spiker`, `opposite_spiker`, `middle_blocker`, `setter` |

### Tables

**`users`** — Auth mirror + app profile
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK, FK → auth.users |
| `email` | TEXT | NOT NULL, UNIQUE |
| `role` | user_role | DEFAULT 'player' |
| `first_name`, `last_name` | TEXT | nullable |
| `skill_level` | skill_level | nullable |
| `birthday_month`, `birthday_day`, `birthday_year` | SMALLINT | nullable (constraints: 1-12, 1-31, 1900-2030) |
| `gender` | TEXT | nullable |
| `player_contact_number` | TEXT | nullable (format: +63XXXXXXXXXX) |
| `emergency_contact_name`, `_relationship`, `_number` | TEXT | nullable |
| `avatar_url` | TEXT | nullable |
| `profile_completed` | BOOLEAN | DEFAULT FALSE |
| `is_guest` | BOOLEAN | DEFAULT FALSE (marks stub guest accounts) |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**`locations`** — Venues
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | TEXT | NOT NULL |
| `address`, `google_map_url`, `notes` | TEXT | nullable |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `created_by` | UUID | FK → users(id) |
| `created_at`, `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | NULL = active; set to NOW() to soft-delete |

**`schedules`** — Game sessions
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `title` | TEXT | NOT NULL |
| `start_time`, `end_time` | TIMESTAMPTZ | NOT NULL (constraint: end > start) |
| `location_id` | UUID | FK → locations(id) |
| `max_players` | INTEGER | NOT NULL (CHECK > 0) |
| `num_teams` | INTEGER | DEFAULT 2 (CHECK >= 2) |
| `required_levels` | TEXT[] | DEFAULT {} (skill level filter) |
| `status` | schedule_status | DEFAULT 'open' |
| `created_by` | UUID | FK → users(id) |
| `created_at`, `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `deleted_at` | TIMESTAMPTZ | NULL = active; set to NOW() to soft-delete |

**`registrations`** — Player slots in a schedule
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `schedule_id` | UUID | FK → schedules(id) ON DELETE CASCADE |
| `registered_by` | UUID | FK → users(id) (who registered them) |
| `player_id` | UUID | FK → users(id) (the player) |
| `team_preference` | team_preference | DEFAULT 'shuffle' |
| `payment_status` | payment_status | DEFAULT 'pending' |
| `payment_proof_url` | TEXT | nullable (path in storage) |
| `attended` | BOOLEAN | DEFAULT FALSE |
| `qr_token` | UUID | UNIQUE, auto-generated on insert |
| `preferred_position` | player_position | nullable |
| `lineup_team_id` | UUID | nullable, FK → teams(id) ON DELETE SET NULL — assigned game-day team (post-lineup-builder) |
| `registration_note` | TEXT | nullable, max 200 chars (CHECK constraint) — optional note from player during registration |
| `created_at`, `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |
| **Unique constraint:** `(schedule_id, player_id)` |

**`teams`** — Named teams for a schedule
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `schedule_id` | UUID | FK → schedules(id) ON DELETE CASCADE |
| `name` | TEXT | NOT NULL |
| `team_type` | TEXT | DEFAULT 'registration', CHECK ('registration' \| 'lineup') — discriminates registration groups from game-day lineups |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

**`team_members`** — Players on teams
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `team_id` | UUID | FK → teams(id) ON DELETE CASCADE |
| `player_id` | UUID | FK → users(id) ON DELETE CASCADE |
| `position` | player_position | nullable |
| **Unique constraint:** `(team_id, player_id)` |

**`registration_payments`** — Payment tracking for registrations
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `registration_id` | UUID | nullable, FK → registrations(id) ON DELETE CASCADE (for solo registrations) |
| `team_id` | UUID | nullable, FK → teams(id) ON DELETE CASCADE (for group/team registrations) |
| `payer_id` | UUID | NOT NULL, FK → users(id) ON DELETE RESTRICT |
| `schedule_id` | UUID | NOT NULL, FK → schedules(id) ON DELETE RESTRICT |
| `registration_type` | TEXT | NOT NULL, CHECK ('solo' \| 'group' \| 'team') |
| `required_amount` | NUMERIC(10, 2) | NOT NULL, DEFAULT 0 |
| `payment_status` | payment_status | NOT NULL, DEFAULT 'pending' — tracks approval state |
| `payment_proof_url` | TEXT | nullable (path in storage bucket) |
| `payment_channel_id` | UUID | nullable, FK → payment_channels(id) ON DELETE SET NULL — payment method used |
| `extracted_amount` | NUMERIC(10, 2) | nullable — OCR-extracted amount from proof |
| `extracted_reference` | TEXT | nullable — OCR-extracted reference number |
| `extracted_datetime` | TIMESTAMPTZ | nullable — OCR-extracted transaction timestamp |
| `extracted_sender` | TEXT | nullable — OCR-extracted sender name |
| `extraction_confidence` | TEXT | nullable — confidence level of OCR extraction |
| `extracted_raw` | JSONB | DEFAULT {} — full OCR result JSON |
| `payment_note` | TEXT | nullable, max 200 chars (CHECK constraint) — optional note from admin |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| **Constraint:** `(registration_id IS NOT NULL OR team_id IS NOT NULL)` — must reference either solo or group registration |

**`mvp_awards`** — Post-game MVP
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `schedule_id` | UUID | FK → schedules(id) ON DELETE CASCADE |
| `player_id` | UUID | FK → users(id) ON DELETE CASCADE |
| `awarded_by` | UUID | FK → users(id) (constraint: != player_id) |
| `note` | TEXT | nullable |
| `awarded_at` | TIMESTAMPTZ | DEFAULT NOW() |

**`role_whitelist`** — Pre-approved admin/facilitator emails
| Column | Type | Notes |
|---|---|---|
| `email` | TEXT | PK |
| `role` | user_role | NOT NULL |

**`logs`** — Activity & error logging
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `level` | TEXT | CHECK IN ('info', 'warn', 'error') |
| `action` | TEXT | NOT NULL |
| `user_id` | UUID | nullable, FK → users(id) |
| `message` | TEXT | nullable |
| `metadata` | JSONB | DEFAULT {} |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

### Indexes

**Consolidated schema (`20250317000000`):**
| Index | Table | Type | Notes |
|---|---|---|---|
| `idx_registrations_schedule_id` | registrations | B-tree | FK join performance |
| `idx_registrations_player_id` | registrations | B-tree | FK join performance |
| `idx_registrations_qr_token` | registrations | B-tree | QR check-in lookup |
| `idx_registrations_pending` | registrations | B-tree (partial) | WHERE payment_status = 'pending' |
| `idx_schedules_start_time` | schedules | B-tree | Calendar ordering |
| `idx_schedules_open` | schedules | B-tree (partial) | WHERE status = 'open' |
| `idx_schedules_created_by` | schedules | B-tree | Admin list |
| `idx_schedules_location_id` | schedules | B-tree | FK join |
| `idx_schedules_status` | schedules | B-tree | Status filter |
| `idx_locations_is_active` | locations | B-tree | Active-only queries |
| `idx_team_members_team_id` | team_members | B-tree | Team roster queries |
| `idx_team_members_player_id` | team_members | B-tree | Player team lookup |
| `idx_mvp_awards_schedule_id` | mvp_awards | B-tree | Per-game awards |
| `idx_mvp_awards_player_id` | mvp_awards | B-tree | Per-player awards |

**Performance additions (`20250318000000`):**
| Index | Table | Type | Notes |
|---|---|---|---|
| `idx_users_first_name_trgm` | users | GIN (trigram) | ILIKE '%q%' search on first_name |
| `idx_users_last_name_trgm` | users | GIN (trigram) | ILIKE '%q%' search on last_name |
| `idx_registrations_preferred_position` | registrations | B-tree | Position-count filter |
| `idx_registrations_schedule_position` | registrations | B-tree (composite) | (schedule_id, preferred_position) for grouped position aggregates |
| `idx_users_role` | users | B-tree | Role-filtered admin queries |

Requires `pg_trgm` extension (enabled in migration `20250318000000`).

**Note:** `users.email` has no additional index — its `UNIQUE` constraint creates an implicit B-tree index sufficient for exact-match auth lookups.

**Soft-delete partial indices (`20250318000001`):**
| Index | Table | Type | Notes |
|---|---|---|---|
| `idx_locations_active` | locations | B-tree (partial) | WHERE deleted_at IS NULL |
| `idx_schedules_active` | schedules | B-tree (partial) | WHERE deleted_at IS NULL |

---

### Soft Delete

Locations and schedules use a soft-delete pattern via `deleted_at TIMESTAMPTZ`:
- `deleted_at IS NULL` — active record (the common case)
- `deleted_at IS NOT NULL` — archived / tombstoned record

**Application code pattern:**
- Deleting: `UPDATE ... SET deleted_at = NOW()` (never a hard DELETE)
- Listing: `.is('deleted_at', null)` filter on all active-record queries
- Restoring: `UPDATE ... SET deleted_at = NULL`

**Archive views** (migration `20250318000002`, admin-only via `private.is_admin()`):
- `public.locations_archive` — all soft-deleted locations
- `public.schedules_archive` — all soft-deleted schedules with location name joined
- `public.schedules_with_registration_count` — active schedules with current registration count (readable by any authenticated user)

**Why soft delete instead of hard delete?**
Registrations, payment records, and attendance history all reference `schedule_id` via FK. Hard-deleting a schedule would cascade-delete all those records (destroying the audit trail) or leave them orphaned. Soft delete preserves history, allows admin recovery, and keeps payment records available for accounting.

---

### Registration & Payment Notes

**`registration_note`** (`registrations` table)
- **Max length:** 200 characters (enforced by CHECK constraint)
- **Purpose:** Optional context from the player during registration (e.g., "I'm in my friend's group", "Special position needed")
- **Set by:** Player at registration time
- **Visibility:** Player (read-only) and admins
- **Editability:** Write-once (not editable after registration)
- **Validation:** Client-side length check, Zod schema, database CHECK constraint

**`payment_note`** (`registration_payments` table)
- **Max length:** 200 characters (enforced by CHECK constraint)
- **Purpose:** Context from admin during payment review (e.g., "Payment received via bank transfer", "Flagged for follow-up investigation")
- **Set by:** Admin when reviewing or manually editing payment records
- **Visibility:** Admins only
- **Editability:** Yes (admins can update note anytime)
- **Validation:** Client-side length check, Zod schema, database CHECK constraint

**Example Workflows:**
1. **Player Registration:** Player enters optional note during registration → note stored in `registration_note` → appears in player's dashboard (read-only)
2. **Admin Payment Review:** Admin reviews payment proof → notices discrepancy → adds note explaining reason for 'review' status → note stored in `payment_note` → visible in payment table
3. **Admin Payment Correction:** Admin manually adjusts payment status → updates `payment_note` to document the correction → note updated in database

---

### Triggers

- **`set_updated_at`** — auto-updates `updated_at` timestamp on UPDATE (applied to users, schedules, registrations, locations)
- **`handle_new_user`** — on auth signup: checks `role_whitelist`, creates `public.users` row with correct role
- **`set_qr_token`** — on registration INSERT: generates UUID for `qr_token` if null

### Row-Level Security (RLS)

All tables have RLS enabled. Key policies:

**`users`**
- SELECT own row (authenticated)
- SELECT all rows (admin)
- SELECT name lookup (any authenticated)
- UPDATE own row (authenticated)
- UPDATE any row (admin)

**`schedules`**
- SELECT (any authenticated)
- INSERT/UPDATE/DELETE (admin only)

**`registrations`**
- SELECT (public, any role)
- SELECT own registrations (authenticated: own as player_id or registered_by)
- SELECT all (admin)
- INSERT (authenticated users, RLS allows group registration as of migration 2)
- UPDATE/DELETE (admin only)

**`locations`**
- SELECT (public)
- INSERT/UPDATE/DELETE (admin only)

**`teams`, `team_members`, `mvp_awards`**
- SELECT (any authenticated)
- INSERT/UPDATE/DELETE (admin/facilitator only, varies by table)

**`logs`**
- SELECT (admin only)
- INSERT/UPDATE/DELETE (service role only, no client writes)

### Storage: `payment-proofs`

Private bucket. Authenticated users upload payment proofs to their own folder (`{userId}/{filename}`). Admins can read/delete all proofs.

---

## API Routes

### POST `/api/profile/complete`
**File:** `src/app/api/profile/complete/route.ts`

Finalizes player onboarding after sign-up.

**Auth:** Requires valid session (anon key client)

**Input:**
```ts
{
  first_name: string
  last_name: string
  birthday_month: 1-12
  birthday_day: 1-31
  birthday_year?: 1900-current year
  gender: string
  player_contact_number: "+63XXXXXXXXXX"
  emergency_contact_name: string
  emergency_contact_relationship: string
  emergency_contact_number: "+63XXXXXXXXXX"
  skill_level: one of 5 skill levels
}
```

**Validation:** Zod schema `onboardingSchema` from `src/lib/validations/profile.ts`

**Output:**
```ts
{ success: true, role: "admin" | "facilitator" | "player" }
```

**Logic:**
1. Verify `profile_completed = false` (reject if already completed)
2. Validate input against `onboardingSchema`
3. Update `public.users` with service client (bypasses RLS)
4. Log success via `logActivity('profile.complete', userId, { ... })`
5. Return `{ success: true, role }` for redirect decision

**Error codes:**
- 401: Not authenticated
- 403: Profile already completed
- 422: Validation failure
- 500: Database error

---

### POST `/api/register/group`
**File:** `src/app/api/register/group/route.ts`

Batch registration for group (2+ players together) or team (complete lineup with positions).

**Auth:** Requires valid session

**Input:**
```ts
{
  schedule_id: uuid
  payment_proof_path: string (path in storage bucket)
  registration_mode: "group" | "team"
  players: [
    {
      type: "existing" | "guest"
      user_id?: uuid (if existing)
      first_name?: string (if guest)
      last_name?: string (if guest)
      email?: string (if guest)
      phone?: string (if guest)
      preferred_position: player_position | null
    }
  ] (min 2 players)
}
```

**Validation:** Zod schema `groupRegistrationSchema` from `src/lib/validations/group-registration.ts`

**Output:**
```ts
{
  results: [
    {
      player_index: number
      player_email_or_name: string
      success: boolean
      user_id?: uuid
      error?: string
    }
  ]
}
```

**Logic Pipeline:**

1. **Player Count Validation**
   - **Group Mode:** Must have 2–5 players
     - Return 400 if `count < 2 or count >= 6`
   - **Team Mode:** Must have 6+ players
     - Return 400 if `count < 6`

2. **Position Validation (different rules per mode)**

   **Group Mode:**
   - Count each position in the group
   - **No minimums** — any position can have 0 players
   - **Per-position maximums:**
     - Setter: max 1
     - Opposite Spiker: max 1
     - Middle Blocker: max 2
     - Open Spiker: max 2
   - Return 400 with `issues` array if any position exceeds its maximum

   **Team Mode:**
   - Get required position minimums via `getRequiredPositions()`:
     - **1 Setter (minimum)**
     - **2 Middle Blockers (minimum)**
     - **2 Open Spikers (minimum)**
     - **1 Opposite Spiker (minimum)**
   - **No maximums** — can have unlimited of any position (e.g., 5 open spikers is valid)
   - Count positions in submitted players
   - Return 400 with `missing` array if any required position is below minimum

3. **Player Resolution**
   - Existing: verify UUID exists in `users`
   - Guest: check if email in `users` → reuse; else create auth user via `admin.createUser()` with `email_confirm: true`, then insert `public.users` with `is_guest: true`

4. **Duplicate Check**
   - Query `registrations` for any `player_id IN (resolved) AND schedule_id = ?`
   - Return 400 per-player if already registered

5. **Batch Insert Registrations**
   - Insert all into `registrations` with `team_preference: group|team`, `payment_status: pending`
   - Store resolved `payment_proof_path`

6. **Create Team & Assign Members**
   - Insert `teams` row named `"{FirstPlayer}'s Group/Team"`
   - Insert `team_members` rows linking all players to team

**Error codes:**
- 400: Position mismatch, player not found, or already registered
- 401: Not authenticated
- 422: Validation failure
- 500: Database error

---

### GET `/api/users/search`
**File:** `src/app/api/users/search/route.ts`

Typeahead search for existing players (used in registration page to add group members).

**Auth:** Requires valid session

**Query Params:**
- `q` (string, min 2 chars) — search term

**Output:**
```ts
[
  {
    id: uuid
    first_name: string | null
    last_name: string | null
    email: string
    skill_level: string | null
  }
]
```

**Logic:**
1. Validate `q` length >= 2
2. Query `users` table excluding `is_guest = true`
3. Filter: `first_name ILIKE %q% OR last_name ILIKE %q% OR email ILIKE %q%`
4. Limit 10
5. Return array (empty if no matches)

**Error codes:**
- 401: Not authenticated
- 400: Query too short
- 500: Database error

---

### GET `/api/registrations/counts`
**File:** `src/app/api/registrations/counts/route.ts`

Returns total registration counts and per-position counts for one or more schedules. Powers the real-time position availability pills in `PublicCalendar`. Uses the service client to bypass RLS so all registrations (across all registrants) are visible.

**Auth:** None required (public endpoint — no session check)

**Query Params:**
- `schedule_ids` (string, comma-separated UUIDs) — e.g. `?schedule_ids=uuid1,uuid2`

**Output:**
```ts
{
  counts: Record<string, number>           // scheduleId → total registrant count
  positionCounts: Record<string, Record<string, number>>  // scheduleId → positionKey → count
}
```

**Logic:**
1. Parse and trim `schedule_ids` param; return 400 if missing
2. If no valid IDs after split/filter, return `{ counts: {}, positionCounts: {} }`
3. Query `registrations` selecting `schedule_id, preferred_position` where `schedule_id IN (...)`
4. Aggregate totals into `counts` and position breakdowns into `positionCounts`
5. Return combined object

**Error codes:**
- 400: Missing `schedule_ids` param
- 500: Database error

---

### GET `/api/registrations/by-position`
**File:** `src/app/api/registrations/by-position/route.ts`

Returns the list of registered players for a specific position slot within a schedule. Consumed by `PositionModal` when a user clicks a position pill to view who has registered. Uses the service client to bypass RLS.

**Auth:** None required (public endpoint — no session check)

**Query Params:**
- `schedule_id` (UUID) — the schedule to query
- `position` (player_position enum value) — the position to filter by

**Output:**
```ts
[
  {
    first_name: string | null
    last_name: string | null
  }
]
```

**Logic:**
1. Validate both `schedule_id` and `position` are present; return 400 if either is missing
2. Query `registrations` joined to `users` (via `users!player_id`) selecting `first_name, last_name`
3. Filter by `schedule_id` and `preferred_position`
4. Map rows to `{ first_name, last_name }` objects
5. Return array (empty if no matches)

**Error codes:**
- 400: Missing `schedule_id` or `position`
- 500: Database error

---

### POST `/api/admin/lineups`
**File:** `src/app/api/admin/lineups/route.ts`

Saves game-day lineup: creates lineup teams and assigns registrations to them.

**Auth:** Requires valid session; role must be `admin`, `super_admin`, or `facilitator`

**Input:**
```ts
{
  schedule_id: uuid
  teams: [
    { name: string (1–60 chars) }
  ] (min 1 team)
  assignments: [
    {
      registration_id: uuid
      team_index: number | null  // null = unassigned
    }
  ]
}
```

**Validation:** Zod schema `saveLineupSchema` from `src/lib/validations/lineup.ts`

**Output:**
```ts
{
  success: true
  message: "Lineup saved successfully"
  teams_created: number
}
```

**Logic:**
1. Authenticate and verify role is admin/super_admin/facilitator
2. Delete existing lineup teams: `DELETE FROM teams WHERE schedule_id = ? AND team_type = 'lineup'` (cascades `SET NULL` on `registrations.lineup_team_id`)
3. Insert new lineup teams: `INSERT INTO teams (schedule_id, name, team_type) VALUES ...` with `team_type = 'lineup'`
4. Bulk update registrations: for each assignment, set `lineup_team_id` to the corresponding lineup team ID (or NULL if unassigned)
5. Log activity via `logError()` (using error log level for audit trail)
6. Return success response

**Lineup vs Registration Teams:**
- **Registration teams:** Created during group/team registration, stored with `team_type = 'registration'`
- **Lineup teams:** Created by this endpoint, stored with `team_type = 'lineup'`. Multiple lineup teams can exist per schedule; only the most recent set is active

**Error codes:**
- 400: Validation failure or invalid request
- 401: Not authenticated
- 403: User role not authorized
- 404: Schedule not found
- 500: Database error

---

## Pages & Routes

### Home (`/`)
**File:** `src/app/page.tsx`

Public-facing schedule browser. Server component.

**Features:**
- Fetches open/full schedules with joined location data (service client)
- Renders `<PublicNav>` and `<PublicCalendar>`
- No auth required

---

### Auth (`/auth`)
**File:** `src/app/auth/page.tsx`

Magic link sign-in. Middleware redirects unauthenticated users here.

**State:**
- `email`, `isLoading`, `isSent` (form state)
- Reads `?error=` param for error display

---

### Create Profile (`/create-profile`)
**File:** `src/app/create-profile/page.tsx`

Player onboarding form. Middleware redirects players with incomplete profiles here.

**State:**
- `isLoading`
- `selectedGenderPreset`, `selectedSkillLevel`
- `playerPhoneDisplay`, `emergencyPhoneDisplay` (phone formatting)
- Form fields: first/last name, birthday (month/day/year), gender, contact numbers, emergency contact, skill level

**Phone Formatting:**
- On blur: strips leading `0` / `63`, prepends `+63`
- Validates: `/^\+63\d{10}$/` (Philippine mobile)
- Stores: `+63XXXXXXXXXX`

**Submit:**
- POST to `/api/profile/complete`
- On success: reads `role` from response, redirects to role dashboard
- On error: shows error toast

---

### Dashboard (`/dashboard`)
**File:** `src/app/dashboard/page.tsx`

Role-agnostic dashboard entry point (legacy/fallback). Resolves role on mount, renders one of three dashboards.

---

### Admin Dashboard (`/admin`)
**File:** `src/app/admin/page.tsx`

Placeholder card grid. Links to `/admin/locations` (only active link).

---

### Admin Locations (`/admin/locations`)
**File:** `src/app/admin/locations/page.tsx`

Full CRUD for locations table.

**State:**
- `locations[]`, `loading`, `dialogOpen`, `editingId`, `deleteTarget`
- Form: `name`, `address`, `google_map_url`, `notes`, `is_active`

**Operations:**
- Load: SELECT * from locations, order by created_at
- Create: INSERT with `created_by: authUser.id`
- Edit: UPDATE only name/address/url/notes/is_active
- Delete: two-step confirmation
- Toggle active: inline update without dialog

**Validation:** Zod `locationSchema`

**UI:** Table with action buttons, skeleton loaders, dialogs for create/edit

---

### Admin Schedules (`/admin/schedules`)
**File:** `src/app/admin/schedules/page.tsx`

Full CRUD for schedules table.

**State:**
- `schedules[]`, `locations[]` (dropdown), `loading`, `dialogOpen`, `editingId`, `deleteTarget`
- Form: `title`, `start_time`, `end_time`, `location_id`, `num_teams`, `required_levels[]`, `status`

**Key Logic:**
- **Timezone handling:** `datetime-local` inputs treated as UTC+8. Helper functions:
  - `toManilaISO("YYYY-MM-DDTHH:mm")` → appends `:00+08:00`
  - `toDatetimeLocal(isoString)` → strips timezone suffix for input
- **Auto-compute:** `max_players = num_teams * 6`
- **Skill filter:** checkboxes for each of 5 skill levels (array)
- **Status:** dropdown (open/full/cancelled/completed)

**Validation:** Zod `scheduleSchema`

---

### Admin Lineups (`/admin/lineups/[scheduleId]`)
**File:** `src/app/admin/lineups/[scheduleId]/page.tsx` (server) + `lineup-client.tsx` (client)

Drag-and-drop lineup builder. Admins/facilitators organize registered players into game-day teams.

**Auth:** Requires `admin`, `super_admin`, or `facilitator` role (verified in RSC and middleware)

**Page Logic (RSC):**
1. Auth check + role verification
2. Fetch schedule with `num_teams`
3. Fetch registrations with users + team_members (to identify registration groups)
4. Fetch existing lineup teams (`team_type = 'lineup'`)
5. Pass to `<LineupClient>`

**Client Component State:**
```ts
type DraggableUnit = {
  unitId: string              // registration_id (solo) or team_id (group)
  type: 'solo' | 'group'      // solo = individual player; group = linked registration group
  registrationIds: string[]   // all reg IDs in this unit
  players: Array<...>         // player info (name, position, skill, guest flag)
  groupName?: string          // registration group name
}

type LineupState = {
  unassigned: DraggableUnit[]
  teams: Array<{
    name: string
    units: DraggableUnit[]
  }>
}
```

**Features:**
- **Unassigned pool:** Shows all players grouped by registration (groups drag atomically)
- **Team columns:** N columns based on `schedule.num_teams`, default names "Team 1", "Team 2", etc.
- **Inline rename:** Click team name to edit (persists in state until save)
- **Drag & drop:** Uses `@dnd-kit/core`. Groups drag as a unit; individual players drag one at a time
- **Save:** POST to `/api/admin/lineups` with team names and assignments → creates lineup teams, updates `registrations.lineup_team_id`

**Initialization Logic:**
- Registrations with `team_members` → grouped by `team_id` → one `DraggableUnit` of type `'group'`
- Registrations without `team_members` → one `DraggableUnit` per registration of type `'solo'`
- If `existingLineupTeams.length > 0` → load existing lineup layout from DB
- Else → create N empty teams, all players go to unassigned

**Drag Mechanics:**
- Each unit is draggable; containers are `"unassigned"` and `"team-0"`, `"team-1"`, ...
- On drop: find source/target containers, move entire unit atomically
- DragOverlay shows preview card while dragging

**Save Handler:**
1. Build assignments array: `{ registration_id, team_index | null }`
2. Validate with `saveLineupSchema`
3. POST to `/api/admin/lineups`
4. On success: toast + router.refresh() + router.back()
5. On error: toast with error message

---

### Admin Registrations (`/admin/registrations`)
**File:** `src/app/admin/registrations/page.tsx` (server) + `registrations-client.tsx` (client)

Browse and manage game registrations by schedule.

**Features:**
- Schedule filter (date + location)
- Registration table: Player, Position, Team (shows lineup team name if exists, else registration group name), Payment status, Registered date
- "Set Lineup" button: navigates to `/admin/lineups/[scheduleId]` when a schedule is selected
- "Register a Player" button: dialog for admin to add single/group/team registrations
- Player detail dialog: shows registrant info + teammates if in a group

---

### Merged Registrations Dashboard (`/dashboard/registrations`)
**File:** `src/app/dashboard/registrations/page.tsx` (server) + `registrations-merged-client.tsx` (client)

Admin and facilitator view of all registrations at a location, split into upcoming/past game sections with filtering and pagination.

**Features:**
- Location dropdown filter (required to display data)
- Date range filter: All, Last 7 Days, Last 30 Days
- Upcoming Games Section: All schedules with future start times, expanded by default, paginated (10 per page)
- Past Games Section: All schedules with past start times, collapsed by default, expandable, paginated
- Expandable game cards showing full registration table per schedule
- Per-registration action menu (view details, mark attendance, verify payment, delete) with role-based visibility
- Dark mode optimized with accent bar styling on game cards

**Components Used:**
- `<RegistrationsFilterBar>` — Location + date range filters
- `<UpcomingGamesSection>` — Upcoming schedules with pagination
- `<PastGamesSection>` — Past schedules with collapsible expand
- `<RegistrationGroupCard>` — Individual game card with player table
- `<RegistrationActionsMenu>` — Per-registration action dropdown

**Hook:**
- `useSchedulesByLocation()` — Fetches schedules + registrations by location, splits into upcoming/past

**API:**
- `GET /api/admin/registrations?locationId={id}` — Returns all schedules at location with registration details

**Auth:** Requires admin or facilitator role

---

### Register (`/register/[scheduleId]`)
**File:** `src/app/register/[scheduleId]/page.tsx`

Group/solo/team registration flow. Most complex page.

**State:**
- `user` — full profile (for skill level check)
- `selectedSchedules` — dict of additional schedules to register for
- `mode` — `'solo' | 'group' | 'team'`
- `groupPlayers[]` — existing or guest players
- `searchQuery`, `searchResults`, `searching` — user search for adding existing players
- `newPlayerForm` — guest player form state
- `position` — selected position (solo mode)
- `paymentFile`, `isSubmitting`

**Initialization:**
1. Auth check → redirect to /auth
2. Fetch user profile + skill level
3. Seed `groupPlayers` with registering user
4. Fetch existing registrations → populate `alreadyRegisteredIds`
5. If already registered for schedule → redirect to /?date=...
6. Fetch primary schedule
7. Check `required_levels` against user's skill level
8. Fetch registration count

**Multi-schedule:** lazy-loaded panel to add more schedules (excludes full, already-registered, already-selected)

**Group search:** GET `/api/users/search?q=...` with debounce, min 2 chars. Adds `type: 'existing'` player.

**Guest add:** form with name/email/phone. Adds `type: 'guest'` player.

**Position requirements (team mode):**
- 6+ team: setter×1, middle_blocker×2, open_spiker×2, opposite_spiker×1
- 5 team: setter×1, middle_blocker×1, open_spiker×2, opposite_spiker×1
- 4 team: setter×1, middle_blocker×1, open_spiker×1, opposite_spiker×1

**Solo submission:**
1. Upload payment file to Storage (`payment-proofs/{userId}/{timestamp}.{ext}`)
2. For each schedule: INSERT registration
3. Toast success, redirect to /?date=...

**Group/Team submission:**
1. Validate all players have positions selected
2. Upload payment file
3. POST `/api/register/group` with payload
4. Display per-player results

---

### Player Dashboard (`/player`)
**File:** `src/app/player/page.tsx`

Placeholder card grid. Links are non-functional (coming soon).

---

### My Registrations (`/dashboard/my-registrations`)
**File:** `src/app/dashboard/my-registrations/page.tsx` (server) + components/registrations/my-registrations-page.tsx (client)

Player view of all their past and upcoming game registrations.

**Features:**
- Real-time subscription to registration changes
- Filters for past/upcoming games
- Game details: date, location, time, payment status
- QR code modal for upcoming games (for check-in)
- Attendance status for completed games
- Registration team assignment display
- Responsive card layout with location info

**Auth:** Requires authenticated user role

---

### Facilitator Dashboard (`/facilitator`)
**File:** `src/app/facilitator/page.tsx`

Placeholder card grid. Links are non-functional (coming soon).

---

### QR Scanner (`/dashboard/scanner`)
**File:** `src/app/dashboard/scanner/page.tsx`

**Status:** Coming soon (stub page)

Designed for: Facilitators to scan QR codes and mark player attendance on game day.

---

### Award MVP (`/dashboard/mvp`)
**File:** `src/app/dashboard/mvp/page.tsx`

**Status:** Coming soon (stub page)

Designed for: Facilitators to award MVP (most valuable player) post-game recognition.

---

## Components

### AppShell (`src/components/app-shell.tsx`)
Universal authenticated layout. Responsive mobile drawer / desktop sidebar.

**Props:**
- `children: React.ReactNode`
- `role?: 'admin' | 'facilitator' | 'player'` (if not provided, fetches from DB)

**State:**
- `resolvedRole` (if role not provided)
- `drawerOpen` (mobile)
- `isLoading`

**Features:**
- Mobile: fixed 64px top bar + hamburger → slide-in 288px drawer
- Desktop: fixed 256px left sidebar
- Nav items per role (some marked "coming soon" with `opacity-40`)
- Sign out button

**Logo & Branding:** from `branding.ts`

---

### PublicNav (`src/components/public-nav.tsx`)
Fixed top nav for public page.

**Features:**
- Checks auth on mount
- Shows: Login (unauth) or Dashboard link (auth)
- Loading skeleton

---

### PublicCalendar (`src/components/public-calendar.tsx`)
Main public schedule browser.

**Props:** `{ schedules: ScheduleWithLocation[] }`

**State:**
- `currentMonth`, `selectedDate`
- `user` (auth state)
- `registrationCounts`, `positionCounts` (per schedule)
- `userRegistrations` (logged-in user's own)
- Modal open states

**Features:**
- Calendar grid with Manila timezone dates
- Animated month transitions
- Schedule cards with location, time, spots badge, position badges
- Register / Show QR buttons
- Click position badge → `<PositionModal>`

---

### LoginModal (`src/components/login-modal.tsx`)
Magic link sign-in dialog.

**Props:**
- `open`, `onOpenChange`
- `scheduleId?` (optional, for redirecting back to schedule after login)

**Features:**
- Email input + Send button
- Two-state: form → sent confirmation
- `emailRedirectTo: /auth/callback?next=/?schedule=...` if scheduleId provided

---

### QRModal (`src/components/qr-modal.tsx`)
Displays player's QR code for game check-in.

**Props:**
- `open`, `onOpenChange`
- `schedule: ScheduleWithLocation | null`
- `registration: Registration | null`

**Features:**
- Shows location, date (long format), time
- Renders QR code from `registration.qr_token`
- Position display

---

### PositionModal (`src/components/position-modal.tsx`)
Details for a position slot in a schedule.

**Props:**
- `open`, `onOpenChange`
- `schedule`, `position`, `totalSlots`, `registeredCount`

**Features:**
- Fill bar (progress)
- Player list (fetched on open)
- "Full" label if available <= 0

---

### PageHeader (`src/components/ui/page-header.tsx`)
Animated admin page header with breadcrumb trail, title, optional record count badge, optional description, and optional primary action button.

**Props:**
```ts
{
  breadcrumb: string           // e.g. "Locations"
  title: string                // page heading
  count?: number               // shown in an outline Badge beside the title
  description?: string
  action?: {
    label: string
    icon: LucideIcon
    onClick: () => void
  }
}
```

**Features:**
- Framer Motion fade-down entrance animation (`opacity: 0, y: -10` → visible)
- Renders "Admin / {breadcrumb}" breadcrumb trail above the title
- Action button is full-width on mobile, auto-width on `sm+`

---

### TableSkeleton (`src/components/ui/table-skeleton.tsx`)
Animated loading placeholder that mirrors the column layout of an admin table, shown while data is being fetched.

**Props:**
```ts
{
  columns: SkeletonColumn[]    // column definitions (see below)
  rows?: number                // default 3
}
```

**`SkeletonColumn` shape:**
```ts
{
  header: string
  className?: string
  skeletonWidth?: string  // Tailwind width class, e.g. "w-48" (default "w-24")
  isPrimary?: boolean     // renders a two-line (title + subtitle) skeleton cell
  isAction?: boolean      // renders a right-aligned button-shaped skeleton
}
```

**Features:**
- Renders real `<Table>` markup with live column headers so layout does not shift when data arrives
- `isPrimary` cells show a taller skeleton with a secondary line below
- `isAction` cells align right with button proportions
- All skeleton divs use `animate-pulse` (Tailwind)

---

### ConfirmDeleteDialog (`src/components/confirm-delete-dialog.tsx`)
Reusable delete-confirmation dialog used across all admin CRUD pages.

**Props:**
```ts
{
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  targetName?: string            // bolded in the description
  warningText?: string           // default "This action cannot be undone."
  onConfirm: () => void
  onCancel: () => void
  isDeleting?: boolean           // disables buttons and shows "Deleting..."
}
```

**Features:**
- Uses `Dialog` primitive with `showCloseButton={false}` (forces explicit Cancel/Delete choice)
- Cancel and Delete buttons are disabled while `isDeleting` is true
- Delete button uses `destructive` variant

---

### FilterAccordion (`src/components/filter-accordion.tsx`)
Collapsible animated filter panel used on admin list pages to reveal filter controls without cluttering the page.

**Props:**
```ts
{
  open: boolean
  onToggle: () => void
  label?: string               // default "Filters"
  activeFilterCount?: number   // appended to label when > 0, e.g. "Filters (2)"
  children: React.ReactNode
}
```

**Features:**
- Framer Motion `AnimatePresence` + `height: 0 → auto` collapse/expand animation
- `ChevronDown` icon rotates 180° when open
- `Filter` icon always shown in the toggle button
- Active filter count shown in the button label when `activeFilterCount > 0`

---

### Registrations Dashboard Components

#### RegistrationGroupCard (`src/components/registrations/registration-group-card.tsx`)
Collapsible card showing a single game's registrations with player details.

**Props:**
```ts
{
  schedule: ScheduleWithLocation
  registrations: RegistrationWithPlayer[]
  isExpanded: boolean
  onToggle: () => void
  onMarkAttendance?: (registrationId: string) => void
  onVerifyPayment?: (registrationId: string) => void
  onDeleteRegistration?: (registrationId: string) => void
  userRole?: 'admin' | 'facilitator'
}
```

**Features:**
- Collapsible header with accent bar styling (dark mode optimized)
- Shows game date, time, location, registration count
- Expandable table showing player details (name, position, skill level, payment status, team)
- Per-registration action menu with role-based visibility
- Animations on expand/collapse

---

#### RegistrationsFilterBar (`src/components/registrations/registrations-filter-bar.tsx`)
Location dropdown and date range filter controls.

**Props:**
```ts
{
  locations: Location[]
  selectedLocationId: string | null
  onLocationChange: (locationId: string) => void
  dateRange: 'all' | 'last7' | 'last30'
  onDateRangeChange: (range: 'all' | 'last7' | 'last30') => void
}
```

**Features:**
- Location dropdown (required to show data)
- Date range buttons: All, Last 7 Days, Last 30 Days
- Responsive layout (stacked on mobile, side-by-side on desktop)

---

#### UpcomingGamesSection (`src/components/registrations/upcoming-games-section.tsx`)
Displays upcoming games (expanded by default) with pagination.

**Props:**
```ts
{
  schedules: ScheduleWithLocation[]
  registrations: RegistrationWithPlayer[]
  isLoading: boolean
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  userRole?: 'admin' | 'facilitator'
}
```

**Features:**
- All schedules with future start times
- Expanded by default (show registrations immediately)
- Pagination: 10 games per page
- Integrates `<RegistrationGroupCard>` for each game

---

#### PastGamesSection (`src/components/registrations/past-games-section.tsx`)
Displays past games (collapsed by default) with expandable sections and pagination.

**Props:**
```ts
{
  schedules: ScheduleWithLocation[]
  registrations: RegistrationWithPlayer[]
  isLoading: boolean
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  userRole?: 'admin' | 'facilitator'
}
```

**Features:**
- All schedules with past start times
- Collapsed by default (expandable)
- Pagination: 10 games per page
- Read-only view (no action buttons)
- Integrates `<RegistrationGroupCard>` for each game

---

#### RegistrationActionsMenu (`src/components/registrations/registration-actions-menu.tsx`)
Dropdown menu for per-registration actions.

**Props:**
```ts
{
  registrationId: string
  userRole?: 'admin' | 'facilitator'
  onViewDetails?: () => void
  onMarkAttendance?: () => void
  onReassignTeam?: () => void
  onVerifyPayment?: () => void
  onEdit?: () => void
  onDelete?: () => void
}
```

**Features:**
- View Details action (always available)
- Mark Attendance (facilitator, upcoming games only)
- Reassign Team (admin, upcoming games)
- Verify Payment (admin only)
- Edit/Delete (admin only)
- Icons paired with text labels
- Disabled state for non-applicable actions

---

#### RegistrationsMergedClient (`src/components/registrations/registrations-merged-client.tsx`)
Main client component orchestrating the merged registrations dashboard.

**Features:**
- Location selection (required to proceed)
- Date range filtering
- State management for upcoming/past sections
- Pagination for both sections
- Real-time data fetching via `useSchedulesByLocation()`
- Loading states and error handling
- Role-based view (admin vs facilitator)

---

### useSchedulesByLocation Hook (`src/lib/hooks/useSchedulesByLocation.ts`)
Fetches schedules and registrations by location, splits into upcoming/past, maps registrations by schedule.

**Returns:**
```ts
{
  upcomingSchedules: ScheduleWithLocation[]
  pastSchedules: ScheduleWithLocation[]
  registrationsBySchedule: Record<string, RegistrationWithPlayer[]>
  isLoading: boolean
  error: Error | null
}
```

**Usage:**
```ts
const { upcomingSchedules, pastSchedules, registrationsBySchedule, isLoading, error }
  = useSchedulesByLocation(locationId)
```

---

## UI Primitives

All in `src/components/ui/`, built on `@base-ui/react` or `@radix-ui`.

| Component | Variants | Sizes | Notes |
|---|---|---|---|
| **Button** | default, outline, secondary, ghost, destructive, link | default, sm, xs, lg, icon, icon-sm, icon-xs, icon-lg | Always `cursor-pointer`, `select-none` |
| **Badge** | default, secondary, destructive, outline, ghost, link | — | Inline, height fixed |
| **Card** | — | default, sm | Wrapper divs with Tailwind grid layout |
| **Dialog** | — | — | Portal-based, optional close button |
| **Input** | — | — | h-8, rounded border |
| **Label** | — | — | Text-sm, cursor-pointer, peer-disabled:opacity-70 |
| **Alert** | default, destructive | — | Grid layout with icon support |
| **Table** | — | — | Overflow-x-auto container |
| **Tabs** | — | default (filled), line (underline) | Orientation: horizontal / vertical |
| **Dropdown Menu** | — | — | Checkbox, radio, sub-menu support |
| **Navigation Menu** | — | — | Mega-menu with animated viewport |
| **Sonner** | — | — | Toast notifications (dark theme, top-right) |

---

## Lib Utilities

### `src/lib/supabase/client.ts`
**Export:** `createClient()`

Browser-side Supabase client. Uses anon key. Typed with `Database` type.

```ts
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
```

---

### `src/lib/supabase/server.ts`
**Export:** `createClient()` (async)

Server-side Supabase client. Reads/writes cookies via Next.js `cookies()`. Typed with `Database` type.

```ts
const supabase = await createClient()
const { data } = await supabase.from('users').select('*')
```

---

### `src/lib/supabase/service.ts`
**Export:** `createServiceClient()`

Service role client. Bypasses RLS. Server-only (uses `SUPABASE_SERVICE_ROLE_KEY`). Never use in client code.

```ts
const db = createServiceClient()
await db.from('logs').insert({ ... })
```

---

### `src/lib/supabase/middleware.ts`
**Export:** `updateSession(request: NextRequest)`

Called from `src/middleware.ts`. Refreshes session JWT at start of every request.

Returns `{ supabaseResponse, user, supabase }`

---

### `src/lib/logger.ts`
**Exports:**
- `logActivity(action: string, userId: string, metadata?: Record<string, unknown>)` — logs level='info'
- `logError(action: string, error: unknown, userId?: string | null, metadata?: Record<string, unknown>)` — logs level='error'

Writes to `logs` table via service client.

---

### `src/lib/errors/messages.ts`
**Exports:**
- `getUserFriendlyMessage(error: unknown): string` — maps Supabase/PostgreSQL/network errors to user-safe copy
- `FALLBACK_ERROR_MESSAGE` — generic fallback string

Supports PostgREST codes (`PGRST116`, `23505`, `42501`, etc.), Supabase Auth codes (`over_email_send_rate_limit`, etc.), Storage errors, and network/timeout failures. Never exposes raw error internals. Used in all client-side `toast.error()` calls.

---

### `src/lib/hooks/useSupabaseQuery.ts`
**Export:** `useSupabaseQuery<T>(options: UseSupabaseQueryOptions)`

Generic hook for Supabase query execution. Manages `{ data, error, isLoading }` state, calls `toast.error()` with user-friendly descriptions on failure, and logs technical errors to console. Accepts a `context` string (e.g. `'load schedules'`) for error messaging and an optional `showToast` flag.

Returns `{ data, error, isLoading, execute }` — call `execute(queryFn)` to run a query.

---

### `src/components/error-boundary.tsx`
**Export:** `ErrorBoundary` (React class component)

Catches unhandled render/lifecycle errors in child components. Logs full technical details to console. Shows a user-friendly recovery card with "Refresh Page" and "Try Again" (reset) buttons. Accepts optional `fallback` render prop for custom error UI.

Usage: wrap any subtree prone to async data errors.

```tsx
<ErrorBoundary>
  <MyDataComponent />
</ErrorBoundary>
```

---

### `src/lib/config/branding.ts`
**Exports:**
- `branding` — loaded from `branding.json`
- `getBrandingMeta()` — returns `{ title, description }` for Next.js metadata
- `Branding` (interface)

Fields:
- `name`, `tagline`
- `logo: { url, altText, width, height }`
- `colors: { primary, secondary, accent, background, text, border }`
- `theme: { lightMode: { ... }, darkMode: { ... } }`
- `social: { twitter?, facebook?, instagram? }`

---

### `src/lib/utils.ts`
**Export:** `cn(...inputs: ClassValue[])`

Utility for merging Tailwind classes. Uses `clsx` + `tailwind-merge`.

```ts
cn('px-2', condition && 'bg-red-500', { 'text-lg': isLarge })
```

---

### `src/lib/hooks/useCrudDialog.ts`
**Exports:** `useCrudDialog()`, `CrudDialogState`, `CrudDialogHandlers`, `UseCrudDialogReturn`

Client-side hook encapsulating the state machine for create / edit / delete dialog flows used across admin CRUD pages. Does not make any API calls — those remain in the page component.

**State fields:** `isOpen`, `editingId` (null = create mode), `deleteTarget` (`{ id, label } | null`)

**Handlers:**
- `onOpenCreate()` — opens dialog in create mode
- `onOpenEdit(id)` — opens dialog pre-populated for editing
- `onOpenDeleteConfirm(id, label)` — sets `deleteTarget` to trigger the `ConfirmDeleteDialog`
- `onCloseDialog()` — closes main dialog and clears `editingId`
- `onCancelDelete()` — clears `deleteTarget`
- `reset()` — resets all state to initial

---

### `src/lib/hooks/usePagination.ts`
**Export:** `usePagination<T>(items: T[], defaultPageSize?: number): UsePaginationReturn<T>`

Generic client-side pagination hook. Accepts a full array of (typically pre-filtered) items and manages current page, page size, and sliced output. Default page size is 15.

**Return shape:**
```ts
{
  currentPage: number        // 1-indexed, clamped to valid range
  pageSize: number
  paginatedItems: T[]        // slice for the current page
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  setCurrentPage(page): void
  setPageSize(size): void    // resets to page 1
  reset(): void
}
```

---

### `src/lib/utils/registration-positions.ts`
**Exports:** `getRequiredPositions()`, `countPositions(players)`, `validateTeamPositions(players, required)`, `validateGroupPositions(players)`

Pure utility functions for position counting and validation used by both the `POST /api/register/group` route and the registration page.

- `getRequiredPositions()` — returns the canonical minimum: `{ setter: 1, middle_blocker: 2, open_spiker: 2, opposite_spiker: 1 }`
- `countPositions(players)` — aggregates position counts for the 4 available positions
- `validateTeamPositions(players, required)` — returns `{ valid, missing? }` for team mode minimum check
- `validateGroupPositions(players)` — returns `{ valid, issues? }` for group mode maximum check (S=1, OS=1, MB=2, OPS=2)

---

### `src/lib/utils/position-slots.ts`
**Exports:** `POSITION_SLOTS`, `PositionKey`, `getPositionTotal()`, `getPositionAvailable()`, `getPositionBreakdown()`

Defines the four tracked positions and their per-team slot multipliers. Used by `PublicCalendar` to compute how many slots exist and how many are still available.

```ts
POSITION_SLOTS = [
  { key: 'open_spiker',     label: 'Open Spiker',     multiplier: 2 },
  { key: 'opposite_spiker', label: 'Opposite Spiker',  multiplier: 1 },
  { key: 'middle_blocker',  label: 'Middle Blocker',  multiplier: 2 },
  { key: 'setter',          label: 'Setter',           multiplier: 1 },
]
```

- `getPositionTotal(key, numTeams)` — `multiplier * numTeams`
- `getPositionAvailable(key, numTeams, registered)` — `max(0, total - registered)`
- `getPositionBreakdown(numTeams, positionCounts)` — full array of `{ key, label, total, registered, available, isFull }`

---

### `src/lib/middleware/profile-cache.ts`
**Exports:** `readProfileCache(request)`, `writeProfileCache(response, data)`, `clearProfileCache(response)`, `ProfileData`

Cookie-based profile data cache used by the middleware to avoid a DB round-trip on every request. Stores `{ role, profile_completed }` in the `x-profile` HTTP-only cookie, base64-encoded JSON, with a 5-minute TTL.

- `readProfileCache` — decodes and parses the cookie; returns `ProfileData | null`
- `writeProfileCache` — encodes and sets the cookie on a response
- `clearProfileCache` — deletes the cookie

---

## Services

### `src/lib/services/guest-user.ts`
**Export:** `createGuestUser(serviceClient, regularClient, guestData, logContext?)`

Encapsulates the create-or-reuse logic for guest players in the group/team registration flow. Extracted from `POST /api/register/group` to make the route testable.

**Input:**
```ts
guestData: {
  email: string
  first_name: string
  last_name: string
  phone?: string
}
```

**Output:**
```ts
{
  user_id: string | null
  error: string | null
  reused: boolean    // true if email already existed in users table
}
```

**Logic:**
1. Look up `email` in `users` table (regular client, respects RLS)
2. If found → return existing `user_id` with `reused: true`
3. Otherwise → call `serviceClient.auth.admin.createUser()` with `email_confirm: true`
4. Insert `public.users` row with `is_guest: true, profile_completed: false, role: 'player'`
5. On any failure → log via `logError()` and return `{ user_id: null, error: <message> }`

---

### `src/lib/utils/timezone.ts`

Centralised timezone utilities. **`APP_TIMEZONE = 'Asia/Manila'`** is the single source of truth — never hardcode `'Asia/Manila'` in components.

**Convention:**
- Database stores all times as UTC (`timestamptz`)
- All display uses Manila time (UTC+8)
- Admin datetime-local inputs are treated as Manila time

**Display helpers (UTC → Manila):**

| Export | Output example | Use case |
|---|---|---|
| `formatScheduleDate(utcDate)` | "Friday, March 20, 2026" | QR modal, registration confirmation |
| `formatScheduleDateShort(utcDate)` | "Mar 20, 2026" | Admin tables |
| `formatScheduleDateWithWeekday(utcDate)` | "Fri, Mar 20" | Register page schedule list |
| `formatScheduleTime(utcDate)` | "2:30 PM" | Calendar cards, QR modal |
| `formatScheduleDateTime(utcDate)` | "Mar 20, 2026, 2:30 PM" | Admin schedule table |
| `toManilaDateKey(utcDate)` | "2026-03-20" | Grouping schedules by calendar date |
| `getTodayManilaKey()` | "2026-03-20" | Calendar "today" highlight |
| `getNowInManila()` | `Date` | Initial month state for calendar |

**Form helpers (Manila input → UTC):**

| Export | Description |
|---|---|
| `manilaInputToUTC(datetimeLocal)` | Appends `+08:00` to datetime-local string before storing |
| `utcToManilaInput(utcDate)` | Converts UTC ISO to `YYYY-MM-DDTHH:mm` for datetime-local inputs |

---

## Validation Schemas

All use Zod 4. Located in `src/lib/validations/`

### `loginSchema`
```ts
{ email: string (min 1, email), password: string (min 6, max 72) }
```
Note: Not primary auth flow (magic link is used instead).

### `onboardingSchema` (from `profile.ts`)
| Field | Type | Constraints |
|---|---|---|
| `first_name` | string | min 1, max 100 |
| `last_name` | string | min 1, max 100 |
| `birthday_month` | number | 1-12, required |
| `birthday_day` | number | 1-31, required |
| `birthday_year` | number | 1900 to current, optional |
| `gender` | string | min 1, max 100 |
| `player_contact_number` | string | `/^\+63\d{10}$/` |
| `emergency_contact_name` | string | min 1, max 100 |
| `emergency_contact_relationship` | string | min 1, max 50 |
| `emergency_contact_number` | string | `/^\+63\d{10}$/` |
| `skill_level` | string | enum of 5 skill levels |

### `locationSchema`
```ts
{
  name: string (min 1, max 255)
  address?: string (max 500)
  google_map_url?: string (url, max 500)
  notes?: string (max 1000)
  is_active: boolean
}
```

### `scheduleSchema`
```ts
{
  title: string (min 1, max 255)
  start_time: string (ISO datetime)
  end_time: string (ISO datetime)
  location_id: uuid
  num_teams: number (int, min 2)
  required_levels: string[] (enum values)
  status: enum ('open', 'full', 'cancelled', 'completed')
}
```
Plus `.refine()` check: `end_time > start_time`

### `groupRegistrationSchema`
```ts
{
  schedule_id: uuid
  payment_proof_path: string (min 1)
  registration_mode: enum ('group', 'team')
  players: [
    {
      type: enum ('existing', 'guest')
      user_id?: uuid
      first_name?: string
      last_name?: string
      email?: string
      phone?: string
      preferred_position?: player_position
    }
  ] (min 2)
}
```

---

## Types

All defined in `src/types/database.ts` (Supabase-generated) and re-exported from `src/types/index.ts`.

**Row Types:**
- `User`, `Schedule`, `Registration`, `Team`, `TeamMember`, `MvpAward`, `Location`, `RoleWhitelist`

**Enum Types:**
- `UserRole`, `ScheduleStatus`, `PaymentStatus`, `TeamPreference`
- `SkillLevel`, `PlayerPosition`

**Insert Types:**
- `ScheduleInsert`, `RegistrationInsert`, `TeamInsert`, `MvpAwardInsert`, `LocationInsert`

**Composed Types:**
```ts
type ScheduleWithLocation = Schedule & {
  locations: Pick<Location, 'id' | 'name'>
}

type PositionCountMap = Record<string, Record<string, number>>
// scheduleId -> positionKey -> count
```

---

## Code Patterns

### Animation — `fadeUpVariants`
```ts
const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: custom * 0.1 },
  }),
}
// Usage:
<motion.div custom={index} initial="hidden" animate="visible" variants={fadeUpVariants}>
  Content
</motion.div>
```

### Modal Close + Reset
```ts
const handleOpenChange = (open: boolean) => {
  setOpen(open)
  if (!open) {
    // Reset state after animation completes (200ms)
    setTimeout(() => {
      setFormState(initialState)
    }, 200)
  }
}
```

### Type Casting for Supabase
```ts
const { data: schedule } = (await supabase
  .from('schedules')
  .select('*')
  .single()) as { data: ScheduleWithLocation | null }
```

---

## Testing

### Framework & Configuration

**Runner:** Vitest (`vitest.config.mts`)

**Environment:** `node` (no DOM/browser simulation — all tests run server-side)

**Test discovery:** `src/**/__tests__/**/*.test.ts`

**Alias:** `@` → `src/` (mirrors `tsconfig.json` path alias)

**Setup file:** `src/__tests__/setup.ts`

Global mocks registered once before any test file runs:
```ts
vi.mock('@/lib/supabase/service')
vi.mock('@/lib/supabase/server')
vi.mock('@/lib/supabase/middleware')
vi.mock('@/lib/logger')
vi.mock('next/headers')
```

Tests configure these mocks per-case using `vi.mocked(...).mockReturnValue(...)`.

### Coverage

**Provider:** v8

**Reporters:** `text` (terminal), `html` (output to `coverage/`)

**Thresholds:**
| Metric | Required |
|---|---|
| Lines | 90% |
| Functions | 90% |
| Branches | 85% |

**Covered files:**
- `src/lib/validations/**`
- `src/lib/utils/timezone.ts`
- `src/lib/utils/position-slots.ts`
- `src/lib/utils/schedule-label.ts`
- `src/lib/utils/registration-positions.ts`
- `src/lib/services/guest-user.ts`
- `src/lib/errors/messages.ts`
- `src/lib/constants/labels.ts`
- `src/lib/config/branding.ts`
- `src/lib/hooks/useSupabaseQuery.ts`
- `src/lib/hooks/useCrudDialog.ts`
- `src/lib/hooks/usePagination.ts`
- `src/lib/middleware/profile-cache.ts`
- `src/middleware.ts`
- `src/app/api/registrations/counts/route.ts`
- `src/app/api/registrations/by-position/route.ts`
- `src/app/api/profile/complete/route.ts`
- `src/app/api/users/search/route.ts`
- `src/app/api/register/group/route.ts`
- `src/app/api/admin/register/route.ts`

### Test Locations

| Area | Test Path |
|---|---|
| Middleware | `src/__tests__/middleware.test.ts` |
| Users search API | `src/app/api/users/search/__tests__/route.test.ts` |
| Group register API | `src/app/api/register/group/__tests__/route.test.ts` |
| Admin register API | `src/app/api/admin/register/__tests__/route.test.ts` |
| Registrations counts API | `src/app/api/registrations/counts/__tests__/route.test.ts` |
| Registrations by-position API | `src/app/api/registrations/by-position/__tests__/route.test.ts` |
| Guest user service | `src/lib/services/__tests__/guest-user.test.ts` |
| useCrudDialog hook | `src/lib/hooks/__tests__/useCrudDialog.test.ts` |
| usePagination hook | `src/lib/hooks/__tests__/usePagination.test.ts` |
| Registration positions utils | `src/lib/utils/__tests__/registration-positions.test.ts` |

### Run Commands

```bash
npm run test           # run all tests once
npm run test:coverage  # run with coverage report
```

---

## Feature Log

Log all new features, pages, API routes, and significant changes here.

| Date | Feature | Files Changed | Notes |
|---|---|---|---|
| 2026-03-18 | Initial setup | Multiple | Schema, auth flow, pages, components, seed scripts |
| 2026-03-18 | Group & Team registration validation | `src/app/api/register/group/route.ts`, `src/app/register/[scheduleId]/page.tsx` | Group: min 1, max 2 per position. Team: strict complete lineup per team size. |
| 2026-03-18 | Registration mode refinement | `src/app/api/register/group/route.ts`, `src/app/register/[scheduleId]/page.tsx` | Group: 2–5 players, per-position max (S=1, OS=1, MB=2, OPS=2). Team: 6+ players, minimum lineup (no max). |
| 2026-03-18 | Error handling & reliability | `src/lib/errors/messages.ts`, `src/lib/hooks/useSupabaseQuery.ts`, `src/components/error-boundary.tsx`, `src/components/app-shell.tsx`, `src/app/dashboard/page.tsx`, `src/components/public-calendar.tsx`, `src/app/admin/locations/page.tsx`, `src/app/admin/schedules/page.tsx` | Error message map, React error boundary, `useSupabaseQuery` hook, user-facing error states with retry in critical paths. |
| 2026-03-18 | Timezone centralization | `src/lib/utils/timezone.ts` (new), `src/app/admin/schedules/page.tsx`, `src/app/register/[scheduleId]/page.tsx`, `src/components/qr-modal.tsx`, `src/components/public-calendar.tsx` | All `'Asia/Manila'` strings and inline date formatting replaced with shared helpers. `APP_TIMEZONE` is single source of truth. |
| 2026-03-18 | Database performance indices (#39) | `supabase/migrations/20250318000000_add_database_indices.sql` | GIN trigram indices on users.first_name/last_name for ILIKE search; composite index on registrations(schedule_id, preferred_position); role index on users. Enables pg_trgm extension. |
| 2026-03-18 | Soft delete for locations & schedules (#38) | `supabase/migrations/20250318000001_add_soft_delete.sql`, `supabase/migrations/20250318000002_soft_delete_views.sql` | Adds deleted_at TIMESTAMPTZ to locations and schedules. Updates RLS SELECT policies to filter active records (deleted_at IS NULL). Creates admin-only archive views (locations_archive, schedules_archive) and schedules_with_registration_count convenience view. |
| 2026-03-19 | Registration counts & by-position API routes | `src/app/api/registrations/counts/route.ts`, `src/app/api/registrations/by-position/route.ts` | New public GET endpoints. `/counts` returns total + per-position counts for a list of schedule IDs (powers real-time position pills). `/by-position` returns registered player names for a schedule+position pair (powers PositionModal roster). Both use service client to bypass RLS. |
| 2026-03-19 | Shared UI components (PageHeader, TableSkeleton, ConfirmDeleteDialog, FilterAccordion) | `src/components/ui/page-header.tsx`, `src/components/ui/table-skeleton.tsx`, `src/components/confirm-delete-dialog.tsx`, `src/components/filter-accordion.tsx` | Extracted repeated patterns from admin pages into reusable components: animated page heading with breadcrumb and action button; pulse-skeleton table loader; standardized delete confirmation dialog; animated collapsible filter panel. |
| 2026-03-19 | Hooks: useCrudDialog, usePagination | `src/lib/hooks/useCrudDialog.ts`, `src/lib/hooks/usePagination.ts` | New client hooks. useCrudDialog encapsulates isOpen/editingId/deleteTarget state machine for CRUD pages. usePagination manages current page, page size, and item slicing for any list. |
| 2026-03-19 | Utils: registration-positions, position-slots, profile-cache | `src/lib/utils/registration-positions.ts`, `src/lib/utils/position-slots.ts`, `src/lib/middleware/profile-cache.ts` | registration-positions: pure functions for group/team position counting and validation. position-slots: POSITION_SLOTS constant + helpers for slot totals and availability. profile-cache: cookie-based middleware cache (x-profile, 5-min TTL) to avoid per-request DB round-trips. |
| 2026-03-19 | Service: guest-user | `src/lib/services/guest-user.ts` | Extracted guest user create-or-reuse logic from group registration route into a standalone service function. Accepts service + regular Supabase clients; returns { user_id, error, reused }. |
| 2026-03-19 | Vitest test suite (Phase 1–3) | `vitest.config.mts`, `src/__tests__/setup.ts`, `src/__tests__/middleware.test.ts`, `src/app/api/**/__tests__/*.test.ts`, `src/lib/**/__tests__/*.test.ts` | Full test infrastructure: Vitest + v8 coverage, global mock setup for Supabase/logger/next/headers, thresholds (lines 90%, functions 90%, branches 85%). Tests cover middleware, all API routes, guest-user service, hooks, and registration-position utilities. |
| 2026-03-26 | Lineup Builder feature | `supabase/migrations/20250326000000_add_lineup_support.sql`, `src/types/database.ts`, `src/types/index.ts`, `src/lib/validations/lineup.ts`, `src/app/api/admin/lineups/route.ts`, `src/app/admin/lineups/[scheduleId]/page.tsx`, `src/app/admin/lineups/[scheduleId]/lineup-client.tsx`, `src/app/admin/registrations/registrations-client.tsx`, `src/middleware.ts` | Drag-and-drop lineup builder: admins/facilitators organize registered players into game-day teams. Adds `team_type` (`registration` \| `lineup`) to teams table, `lineup_team_id` to registrations. New `/admin/lineups/[scheduleId]` page with DnD UI (@dnd-kit/core). Groups drag atomically; individual players drag separately. Save creates lineup teams + assigns registrations. Facilitators access via shared SHARED_PATHS middleware exemption. |
| 2026-03-28 | My Registrations page | `src/app/dashboard/my-registrations/page.tsx`, `src/components/registrations/my-registrations-page.tsx`, `src/components/registrations/registered-game-card.tsx`, `src/lib/hooks/useMyRegistrations.ts` | New player-facing page showing all past and upcoming registrations. Real-time subscription to registration changes. Displays game details (date, location, time, payment status), QR codes for upcoming games, attendance status for past games. Available to all authenticated users from main dashboard. |
| 2026-03-29 | Merged Registrations Dashboard (in design) | `docs/superpowers/plans/2026-03-29-merged-registrations-dashboard.md`, `docs/superpowers/specs/2026-03-29-merged-registrations-dashboard-design.md` | New admin view combining all registrations with location-first filtering and games grouped by time. Improves UX for admins managing multiple games across venues. Design phase complete; implementation pending. |
| 2026-04-03 | Add banned_at to users | `supabase/migrations/20260403000000_add_banned_at_to_users.sql`, `src/types/database.ts` | Adds nullable timestamptz column for soft-ban support. NULL = active user. |
| | | | |

