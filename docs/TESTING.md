# Unit Testing Plan — Volleyball Reservation App

**Status:** Planned (ready for Phase 1)
**Total Tests Planned:** ~307
**Coverage Target:** Lines 90%, Functions 90%, Branches 85%
**Framework:** Vitest v4.1.0

---

## Overview

This document is the authoritative testing reference for the volleyball reservation system. It defines a six-phase rollout from zero-dependency pure-function tests through complex mocked integration-style route handler tests. Each phase is self-contained and can run independently.

### Why This Structure?

1. **Phase 1 & 2** (pure functions, schemas) provide immediate feedback with zero setup
2. **Phase 3** (mocked modules) introduces mocking infrastructure once and reuses it
3. **Phases 4–6** (routes, hooks, utilities) build on the foundation for complex scenarios
4. Each phase has an independent run command for fast iteration

---

## Pre-Phase Setup: Shared Infrastructure

Before any test is written, create the following shared files and update the Vitest config.

### Create Shared Mock Helpers

**File:** `src/__tests__/helpers/supabase-mock.ts`

Factory functions for fully-typed Supabase mocks using `vi.fn()`. The mock must support a chainable query builder pattern.

```typescript
// Pseudo-implementation
export function createMockServiceClient() {
  // Returns mock with .from() → .select() → .in() → .single() chain
  // All intermediate methods return the same mock object (for chaining)
  // .select(), .in(), .eq(), .insert(), .update() all return { data: null, error: null }
  // Also exposes .auth.admin.createUser() and .auth.getUser()
}

export function createMockServerClient() {
  // Same structure as service client
}
```

**File:** `src/__tests__/helpers/next-mock.ts`

Constructors for mock `NextRequest` and `NextResponse` objects.

```typescript
export function createMockRequest(url: string, options?: {
  method?: string;
  body?: object;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}) {
  // Returns NextRequest with parsed URL, method, body, and cookies
}

export function createMockResponse() {
  // Returns NextResponse with mock .cookies object
  // .cookies.set() and .cookies.delete() are tracked via vi.fn()
}
```

**File:** `src/__tests__/setup.ts`

Global mock registrations (executed once before any test).

```typescript
import { vi } from 'vitest'

vi.mock('@/lib/supabase/service')
vi.mock('@/lib/supabase/server')
vi.mock('@/lib/supabase/middleware')
vi.mock('@/lib/logger')
vi.mock('next/headers')
```

### Update `vitest.config.mts`

1. Add `setupFiles` to enable global mocks:
```typescript
test: {
  setupFiles: ['src/__tests__/setup.ts'],
  // ... rest of config
}
```

2. Expand `coverage.include` array to include all target files:
```typescript
coverage: {
  include: [
    // Existing:
    'src/lib/validations/**',
    'src/lib/utils/timezone.ts',
    'src/lib/errors/messages.ts',
    'src/lib/constants/labels.ts',
    'src/lib/config/branding.ts',
    // New:
    'src/lib/utils/position-slots.ts',
    'src/lib/utils/schedule-label.ts',
    'src/lib/middleware/profile-cache.ts',
    'src/middleware.ts',
    'src/app/api/registrations/counts/route.ts',
    'src/app/api/registrations/by-position/route.ts',
    'src/app/api/profile/complete/route.ts',
    'src/app/api/users/search/route.ts',
    'src/app/api/register/group/route.ts',
    'src/app/api/admin/register/route.ts',
  ],
  // ... rest of config
}
```

---

## Phase 1 — Pure Functions, Zero Mocking

**Status:** Ready to implement
**Estimated Tests:** ~80
**Coverage Target:** 100% lines, 100% functions, 100% branches
**Time to Write:** 3–4 hours
**Time to Run:** <1 second

### Why Start Here?

- No mocking required (fastest possible feedback loop)
- Pure functions are the easiest to test
- Establishes the baseline test file structure and naming convention
- All these modules have no external dependencies

### Target Files

#### 1A — `src/lib/utils/timezone.ts` (10 functions)

**Test File:** `src/lib/utils/__tests__/timezone.test.ts`

**Purpose:** All date/time formatting functions for Manila timezone. This is critical for schedule display correctness.

**Functions to Test:**

| Function | Key Test Cases |
|----------|-----------------|
| `formatScheduleDate()` | UTC 2026-03-19T16:00:00Z → "Friday, March 20, 2026" (crosses midnight into Manila date); falsy input → `''`; invalid string → raw string (catch) |
| `formatScheduleDateShort()` | "Mar 20, 2026" format; falsy → `''` |
| `formatScheduleDateWithWeekday()` | "Fri, Mar 20" format; falsy → `''` |
| `formatScheduleTime()` | UTC 06:30Z (2:30 PM Manila); UTC 00:00Z (8:00 AM Manila); falsy → `''` |
| `formatScheduleDateTime()` | Combined format; falsy → `''` |
| `toManilaDateKey()` | Returns "2026-03-20" (YYYY-MM-DD in Manila TZ); UTC 16:00Z previous day → next day key |
| `getTodayManilaKey()` | Returns current date in Manila TZ; format matches `/^\d{4}-\d{2}-\d{2}$/`; never throws |
| `getNowInManila()` | Returns `Date` instance; `.getFullYear()` reflects Manila calendar year, not UTC year |
| `manilaInputToUTC()` | "2026-03-20T14:30" → "2026-03-20T14:30:00+08:00"; empty string → `''` |
| `utcToManilaInput()` | "2026-03-20T06:30:00+00:00" → "2026-03-20T14:30" (UTC+8); **midnight edge case:** hour `'24'` normalizes to `'00'` |

**Important Note — ICU Full Support Required:**

These functions rely on `Intl.DateTimeFormat` with `timeZone: 'Asia/Manila'`. The Node.js environment must have full ICU support (available by default in Node 18+ on most systems). To verify:

```bash
node -e "console.log(new Date('2026-03-20T06:30:00Z').toLocaleString('en-US', { timeZone: 'Asia/Manila' }))"
```

If it fails with a timezone error, your CI environment needs `--icu-data-dir` or full-icu bundled. This should be handled in the CI config, not in the tests.

---

#### 1B — `src/lib/utils/position-slots.ts` (3 functions + 1 constant)

**Test File:** `src/lib/utils/__tests__/position-slots.test.ts`

**Purpose:** Volleyball position slot math. Drives all availability calculations on the public calendar.

**Exports to Test:**

| Export | Key Test Cases |
|--------|-----------------|
| `POSITION_SLOTS` constant | Exactly 4 entries; keys: `open_spiker`, `opposite_spiker`, `middle_blocker`, `setter`; multipliers: 2, 1, 2, 1 respectively |
| `PositionKey` type | Just verify it's exported (TypeScript-only, no runtime test needed) |
| `getPositionTotal(positionKey, numTeams)` | Known key + 3 teams → correct `multiplier * 3`; unknown key → 0; `numTeams = 0` → 0 |
| `getPositionAvailable(positionKey, numTeams, registered)` | `registered < total` → correct difference; `registered === total` → 0 (full); `registered > total` → 0 (clamped, no negatives) |
| `getPositionBreakdown(numTeams, positionCounts)` | 2 teams, no registrations → all `isFull: false`, correct totals; all full → all `isFull: true`; partial fill → mix of full/not-full; returns array of 4 matching slot order |

---

#### 1C — `src/lib/errors/messages.ts` (1 function)

**Test File:** `src/lib/errors/__tests__/messages.test.ts`

**Purpose:** Maps Supabase and backend errors to user-friendly messages.

**Function:** `getUserFriendlyMessage(error)`

**Key Test Cases:**

| Input Type | Test Cases |
|-----------|-----------|
| Falsy (null, undefined) | → `FALLBACK_ERROR_MESSAGE` |
| PostgREST error `{ code: 'PGRST116' }` | → correct message for that code |
| PostgREST error `{ code: '23505' }` | → unique constraint message |
| PostgREST error `{ code: '42501' }` | → permission denied message |
| Auth error `{ error_code: 'invalid_credentials' }` | → "Invalid email or password" |
| Auth error `{ error_code: 'over_email_send_rate_limit' }` | → rate limit message |
| Storage error `{ message: 'Payload too large' }` | → file too large message |
| Storage error `{ message: 'contains Invalid mime type in string' }` | → mime type message |
| Auth code in message `{ message: 'user_banned: account suspended' }` | → banned message |
| `Error` with `message.includes('fetch')` | → network error message |
| `Error` with `message.includes('timeout')` | → timeout message |
| Unknown error code | → `FALLBACK_ERROR_MESSAGE` |
| Plain string | → `FALLBACK_ERROR_MESSAGE` |
| Empty object `{}` | → `FALLBACK_ERROR_MESSAGE` |

Also verify: `FALLBACK_ERROR_MESSAGE` is exported and is a non-empty string.

---

#### 1D — `src/lib/constants/labels.ts` (3 objects)

**Test File:** `src/lib/constants/__tests__/labels.test.ts`

**Purpose:** Static label maps for enums (no runtime logic, just data coverage).

**Exports to Test:**

| Export | Key Test Cases |
|--------|-----------------|
| `SKILL_LEVEL_LABELS` | Exactly 5 entries covering all enum values; each maps to non-empty string; no undefined values |
| `POSITION_LABELS` | Exactly 5 entries (4 positions + alternative name?); all non-empty strings |
| `STATUS_LABELS` | Exactly 4 entries (`open`, `full`, `cancelled`, `completed`); all non-empty strings |

**Structure Test:**
- Regression test: verify specific keys map to exact expected strings (prevents accidental typos in label updates)

---

#### 1E — `src/lib/config/branding.ts` (1 export)

**Test File:** `src/lib/config/__tests__/branding.test.ts`

**Purpose:** Load and validate branding config loaded from `branding.json`.

**Export:** `branding` object + optionally `getBrandingMeta()`

**Test Cases:**

| Property | Test |
|----------|------|
| `branding.name` | Non-empty string |
| `branding.tagline` | Non-empty string |
| `branding.logo.url` | String starting with `/` (relative path) |
| `branding.logo.altText` | Non-empty string |
| `branding.logo.width`, `.height` | Positive numbers |
| `branding.colors` | Object with 6 required keys (`primary`, `secondary`, `accent`, `background`, `text`, `border`), all non-empty strings |
| `branding.theme.lightMode` | Object with `background`, `foreground`, `muted` (each non-empty string) |
| `branding.theme.darkMode` | Same structure as lightMode |
| `branding.social` | Object (may have optional keys; no strict schema) |

**Optional test:** If `getBrandingMeta()` exists, verify it returns `{ title: branding.name, description: branding.tagline }`.

---

### Phase 1 Execution

**Run Command:**
```bash
npx vitest run src/lib/utils src/lib/errors src/lib/constants src/lib/config
```

**Verify:**
```bash
npm run test:coverage
```

Check that lines, functions, and branches reach 100% for Phase 1 files.

---

## Phase 2 — Zod Validation Schemas

**Status:** Ready to implement
**Estimated Tests:** ~75
**Coverage Target:** 100% lines, 100% functions, 100% branches
**Time to Write:** 4–5 hours
**Time to Run:** <1 second

### Why Phase 2?

- All schemas are synchronous, no mocking required
- Each schema has multiple valid and invalid branches (rich test surface)
- Schemas are the frontend/backend boundary — comprehensive coverage prevents validation bypasses
- Can run in parallel with or after Phase 1 (no dependencies)

### Target Files — All in `src/lib/validations/__tests__/`

#### 2A — `auth.ts` → `auth.test.ts`

**Schema:** `loginSchema`

**Test Cases:**

```
✓ Valid: email@example.com + password (6–72 chars)
✗ Invalid email format
✗ Email empty/missing
✗ Password < 6 chars
✗ Password > 72 chars
✗ Both fields missing
```

---

#### 2B — `location.ts` → `location.test.ts`

**Schema:** `locationSchema`

**Test Cases:**

```
✓ Valid: name + is_active (minimal)
✓ All fields present
✗ Name empty
✗ Name > 255 chars
✗ google_map_url not a valid URL
✓ google_map_url null (nullable + optional)
✓ google_map_url omitted (optional)
✗ address > 500 chars
✗ notes > 1000 chars
✗ is_active missing (required)
✓ is_active: false
```

---

#### 2C — `user-search.ts` → `user-search.test.ts`

**Schema:** `userSearchSchema`

**Purpose:** Input sanitization. The regex prevents SQL injection and special characters.

**Test Cases:**

```
✓ Valid: q = 'john' (2–100 chars, alphanumeric + whitespace)
✗ q < 2 chars
✗ q > 100 chars
✗ q contains % (SQL wildcard)
✗ q contains -- (SQL comment)
✗ q contains '; DROP TABLE (injection attempt)
✓ q = 'user@example.com' (@ is in whitelist)
✓ q = "O'Brien" (apostrophe in whitelist)
✓ q = '+63' (+ in whitelist)
✓ q contains underscore
✗ Whitespace-only query (check trim behavior with 2+ spaces)
```

---

#### 2D — `profile.ts` → `profile.test.ts`

**Schema:** `onboardingSchema`

**Purpose:** Player profile completion. Validates all fields including Philippine phone regex and birthday bounds.

**Test Cases:**

| Field | Test Cases |
|-------|-----------|
| `first_name`, `last_name`, `middle_name_optional` | Empty → error; > 100 chars → error |
| `birthday_month` | 0 → error (min 1); 13 → error (max 12); valid: 1–12 |
| `birthday_day` | 0 → error; 32 → error; valid: 1–31 |
| `birthday_year` | 1899 → error (min 1900); current year + 1 → error (max current year); omitted → accepted (optional) |
| `gender` | Must be in enum (e.g., 'male', 'female', 'other') or error |
| `player_contact_number` | "+63912345678" (11 digits after +63) → passes; "09123456789" (no +63) → fails; "+639123456789" (12 digits) → fails (regex is +63 + 10 digits) |
| `emergency_contact_number` | Same regex as player_contact_number |
| `emergency_contact_relationship` | Non-empty string required |
| `skill_level` | Must be in enum ('developmental', 'intermediate', 'advanced', 'elite', 'pro') |

---

#### 2E — `schedule.ts` → `schedule.test.ts`

**Schemas:** `scheduleSchema`, `teamRosterSchema`

**Schedule Test Cases:**

```
✓ Valid: all fields present, end_time > start_time
✗ end_time ≤ start_time (cross-field refinement error)
✗ location_id not a UUID
✗ num_teams < 2 (min 2)
✗ required_levels contains invalid enum value
✗ status not in enum
✗ title empty
```

**Team Roster Test Cases** (must match Combo A or Combo B):

```
✓ Combo A: [open_spiker, open_spiker, opposite_spiker, middle_blocker, middle_blocker, setter]
✓ Combo B: [open_spiker, open_spiker, opposite_spiker, opposite_spiker, middle_setter, middle_blocker]
✗ < 6 players (array min error)
✗ 6 players but wrong counts (e.g., 3 setters) → refinement error
✗ Mixed combo matching neither A nor B → refinement error
✗ middle_setter outside Combo B context → fails refinement
```

---

#### 2F — `group-registration.ts` → `group-registration.test.ts`

**Schemas:** `groupPlayerSchema` (discriminated union), `groupRegistrationSchema`

**Group Player Union Test Cases:**

```
✓ Existing player: valid UUID user_id + valid preferred_position
✗ Existing player: non-UUID user_id → error
✓ Guest player: valid email + first_name + last_name + preferred_position
✗ Guest player: invalid email → error
✗ Guest player: empty first_name → error
✓ Guest player: phone omitted (optional)
✗ Object with type: 'unknown' → union discriminator fails
```

**Group Registration Test Cases:**

```
✓ Valid: registration_mode: 'group' + 2 players
✗ players array with 1 player (min 2 error)
✗ schedule_id not UUID
✗ payment_proof_path empty
✗ registration_mode: 'unknown' → error
```

---

#### 2G — `admin-registration.ts` → `admin-registration.test.ts`

**Schema:** `adminRegistrationSchema`

**Purpose:** Admin-specific registration with payment status and team preference defaults.

**Test Cases:**

```
✓ Valid: registration_mode: 'single' + 1 player + payment_status: 'paid'
✗ players array empty (min 1 error — different from group schema min of 2)
✓ payment_status omitted → defaults to 'pending'
✓ team_preference omitted → defaults to 'shuffle'
✓ registration_mode: 'single' accepted (unique to admin schema)
✗ registration_mode: 'invalid' → error
✗ payment_status: 'unknown' → error
✓ Inherits groupPlayerSchema: test both 'existing' and 'guest' subtypes
```

---

### Phase 2 Execution

**Run Command:**
```bash
npx vitest run src/lib/validations
```

**Verify:**
```bash
npm run test:coverage -- src/lib/validations
```

Check that coverage reaches 100% for all schema files.

---

## Phase 3 — Modules Requiring Mocking

**Status:** ✅ Complete (2026-03-19)
**Estimated Tests:** ~70
**Coverage Target:** Lines 90%, Functions 90%, Branches 85%
**Time to Write:** 6–8 hours (includes mock helper debugging)
**Time to Run:** ~2 seconds

### Why Phase 3?

- Introduces mocking infrastructure (Supabase, Next.js)
- Tests modules that have external dependencies (services, middleware)
- Most "thin" routes (simple query + format logic) rather than complex business logic
- Easier to get right than Phase 4 before moving to complex routes

### Target Files

#### 3A — `src/lib/middleware/profile-cache.ts`

**Test File:** `src/lib/middleware/__tests__/profile-cache.test.ts`

**Mocking Strategy:** `createMockRequest()` and `createMockResponse()` from helpers (no Supabase mocking needed).

**Functions to Test:**

| Function | Key Test Cases |
|----------|-----------------|
| `readProfileCache(request)` | Valid base64-encoded JSON `{ role: 'admin', profile_completed: true }` → decoded object; invalid base64 → null (caught); valid base64 + non-JSON content → null (caught); cookie absent → null |
| `writeProfileCache(response, data)` | Sets cookie named `'x-profile'` with base64-encoded input data; cookie has `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 300` |
| `clearProfileCache(response)` | Calls `response.cookies.delete('x-profile')` |

**Test Structure:**
```typescript
describe('readProfileCache', () => {
  it('returns decoded ProfileData for valid cookie', () => { ... })
  it('returns null for invalid base64', () => { ... })
  it('returns null for non-JSON content', () => { ... })
  it('returns null when cookie absent', () => { ... })
})

describe('writeProfileCache', () => {
  it('sets cookie with correct attributes', () => { ... })
  it('encodes data as base64', () => { ... })
})

describe('clearProfileCache', () => {
  it('deletes x-profile cookie', () => { ... })
})
```

---

#### 3B — `src/app/api/registrations/counts/route.ts`

**Test File:** `src/app/api/registrations/counts/__tests__/route.test.ts`

**Mocking Strategy:** `vi.mock('@/lib/supabase/service')`. For each test:
```typescript
vi.mocked(createServiceClient).mockReturnValue(
  createMockServiceClient().setup(/* query expectations */)
)
```

**Route Handler:** `GET(request: NextRequest) → NextResponse`

**Test Cases:**

| Scenario | Expected Response |
|----------|------------------|
| Missing `schedule_ids` param | 400 `{ error: 'Missing required parameter: schedule_ids' }` |
| `schedule_ids=` (empty after split) | 200 `{ counts: {}, positionCounts: {} }` |
| Supabase query returns error | 500 `{ error: 'Failed to fetch registration counts' }` |
| 1 schedule, 3 registrations (2 open_spiker, 1 setter) | 200 `{ counts: { sid: 3 }, positionCounts: { sid: { open_spiker: 2, setter: 1 } } }` |
| Multiple schedules in one call | Correct per-schedule aggregation with no cross-contamination |
| Registration with `preferred_position: null` | Increments `counts[sid]` but not `positionCounts` |
| Unhandled exception in Supabase call | 500 `{ error: 'Internal server error' }` |

---

#### 3C — `src/app/api/registrations/by-position/route.ts`

**Test File:** `src/app/api/registrations/by-position/__tests__/route.test.ts`

**Mocking Strategy:** `vi.mock('@/lib/supabase/service')` (same as 3B).

**Route Handler:** `GET(request: NextRequest) → NextResponse`

**Test Cases:**

| Scenario | Expected Response |
|----------|------------------|
| Missing `schedule_id` | 400 |
| Missing `position` | 400 |
| Missing both | 400 |
| Supabase query returns error | 500 |
| Supabase returns empty array | 200 `[]` |
| Supabase returns 2 rows with users joined | 200 with player name objects extracted from users |
| Row where `r.users` is null | Null values in output `{ first_name: null, last_name: null }` |

---

#### 3D — `src/app/api/profile/complete/route.ts`

**Test File:** `src/app/api/profile/complete/__tests__/route.test.ts`

**Mocking Strategy:**
- `vi.mock('@/lib/supabase/server')` — for `getUser()`
- `vi.mock('@/lib/supabase/service')` — for user update
- `vi.mock('@/lib/logger')` — suppress log calls
- `vi.mock('@/lib/middleware/profile-cache')` — spy on `clearProfileCache`

**Route Handler:** `POST(request: NextRequest) → NextResponse`

**Test Cases:**

| Scenario | Expected Response |
|----------|------------------|
| No authenticated user (`auth.getUser` returns null) | 401 |
| Auth error | 401 |
| User exists, `profile_completed: true` | 403 `'Profile already completed'` |
| Invalid JSON body | 400 `'Invalid JSON'` |
| Body fails `onboardingSchema` validation | 422 with flattened Zod errors array |
| Valid body, service client update returns error | 500 |
| Valid body, update succeeds | 200 `{ success: true, role: user?.role \|\| 'player' }` → verify `clearProfileCache` called |

---

#### 3E — `src/app/api/users/search/route.ts`

**Test File:** `src/app/api/users/search/__tests__/route.test.ts`

**Mocking Strategy:**
- `vi.mock('@/lib/supabase/server')`
- `vi.mock('next/headers')` — mock `cookies()` to return a mock cookie store
- `vi.stubEnv()` — stub `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Route Handler:** `GET(request: NextRequest) → NextResponse`

**Test Cases:**

| Scenario | Expected Response |
|----------|------------------|
| `q` < 2 chars | 400 with validation error message |
| `q` with invalid characters (`%`, `;`) | 400 |
| Missing env vars | 500 `'Server misconfiguration'` |
| No authenticated user | 401 |
| Valid query, Supabase returns error | 500 |
| Valid query, Supabase returns users array | 200 with user objects |
| Valid query, Supabase returns null | 200 `[]` |

---

#### 3F — `src/middleware.ts`

**Test File:** `src/__tests__/middleware.test.ts`

**Mocking Strategy:**
- `vi.mock('@/lib/supabase/middleware')` — control `updateSession` return value
- `vi.mock('@/lib/middleware/profile-cache')` — control `readProfileCache` and `writeProfileCache`

**Middleware Handler:** `middleware(request: NextRequest) → NextResponse | undefined`

**9 Routing Scenarios:**

| # | Scenario | Expected Behavior |
|---|----------|------------------|
| 1 | Static asset (`/_next/static/...`) | Pass through, return `supabaseResponse` directly, no redirect |
| 2a | Unauthenticated on public route (`/auth`) | Pass through, return `supabaseResponse` |
| 2b | Unauthenticated on public route (`/`) | Pass through, return `supabaseResponse` |
| 3 | Unauthenticated on protected route (`/player/dashboard`) | Redirect to `/auth?returnUrl=/player/dashboard`; session cookies copied to redirect |
| 4a | Authenticated, complete profile, on `/auth` | Redirect to `/dashboard` |
| 4b | Authenticated, complete profile, on `/auth?returnUrl=/player` | Redirect to `/player` |
| 4c | Authenticated, complete profile, on `/auth?returnUrl=/auth/callback` | Redirect to `/dashboard` (anti-loop guard) |
| 5 | Authenticated, incomplete profile, on `/create-profile` | Pass through (exempt route) |
| 5b | Authenticated, incomplete profile, on `/api/profile/complete` | Pass through (exempt route) |
| 6 | Authenticated, incomplete profile, on `/player/dashboard` | Redirect to `/create-profile?returnUrl=/player/dashboard` |
| 7 | Authenticated, complete profile, on `/` | Pass through |
| 8a | Player role on `/admin/dashboard` | Redirect to `/dashboard` |
| 8b | Facilitator role on `/admin/reports` | Redirect to `/dashboard` |
| 8c | Player role on `/player/profile` | Pass through (correct role) |
| 8d | Super-admin role on `/admin/anything` | Pass through (super-admin → /admin mapping) |
| 9 | Admin role on `/admin/schedules` | Pass through (correct role) |

**Profile Cache Hit/Miss Tests:**

- Cache hit (`readProfileCache` returns valid data) → does NOT call Supabase
- Cache miss (`readProfileCache` returns null) → calls `.from('users').select('role, profile_completed')` and writes cache

---

### Phase 3 Execution

**Run Command:**
```bash
npx vitest run src/lib/middleware src/app/api/registrations src/app/api/users src/app/api/profile src/middleware.test.ts
```

**Verify:**
```bash
npm run test:coverage
```

Check that coverage reaches 90%/85% thresholds for Phase 3 files.

---

## Phase 4 — Complex Route Handlers (Multi-Step Flows)

**Status:** Ready after Phase 3
**Estimated Tests:** ~65
**Coverage Target:** Lines 85%, Functions 90%, Branches 80%
**Time to Write:** 8–10 hours (most complex logic)
**Time to Run:** ~2 seconds

### Why Phase 4?

- Both routes have 6+ step multi-branch business logic
- Player resolution (existing user vs. guest creation) is non-trivial
- Duplicate detection, team creation conditionals, and error propagation require careful test design
- Phase 3 must complete first (route infrastructure mocking)

### Important Architectural Note

The route `src/app/api/register/group/route.ts` contains **three unexported helper functions** (`countPositions`, `validateTeamPositions`, `validateGroupPositions`). For Phase 4, **test them via the route handler** by constructing request bodies that exercise each branch. This approach:

- Requires no refactoring
- Tests the functions in their real context (with HTTP boundary)
- Is integration-style but still counts as unit testing

**Future refactor:** Extract these three functions to `src/lib/utils/registration-positions.ts` and export them. Then replace the route-level integration tests with focused unit tests and retain the route tests for HTTP boundary behaviors only. File this as a separate task after Phase 4 completes.

---

### Target Files

#### 4A — `src/app/api/register/group/route.ts`

**Test File:** `src/app/api/register/group/__tests__/route.test.ts`

**Mocking Strategy:** Same as Phase 3 complex routes:
- `vi.mock('@/lib/supabase/server')` and `vi.mock('@/lib/supabase/service')`
- `vi.mock('@/lib/logger')`
- Build a helper: `makeGroupRequest(body)` wraps `createMockRequest(...POST, body)`

**6-Step Flow to Test:**

| Step | Logic | Test Cases |
|------|-------|-----------|
| 0 | Validation + body parsing | Invalid JSON → 400; body fails `groupRegistrationSchema` → 400 with Zod errors |
| 0b | Group mode position validation (`countPositions`, `validateGroupPositions`) | Group: 6+ players → 400; 3 players with 2 setters → 400 (max 1); valid positions → pass; `middle_setter` counts as setter |
| 0c | Team mode position validation (`validateTeamPositions`) | Team: <6 players → 400; 6 players missing setter → 400 with `missing` array; `middle_setter` counts → passes; valid lineup → pass |
| 1 | Auth check | `auth.getUser()` returns null → 401 |
| 1b | Player resolution (3 sub-cases) | Existing: lookup success → resolved; lookup error/null → `resolution.error`; Guest with existing email → reuse user; Guest new → create auth user + insert users row (both can error) |
| 2 | Duplicate check | If any player already registered on schedule → 400 with results array |
| 3 | Batch insert registrations | `from('registrations').insert()` error → 500 |
| 4 | Team creation | `from('teams').insert()` error → 500; `from('team_members').insert()` error → 500 |
| 5 | Success | All steps pass → 200 with `results` array, all `success: true` |

**Detailed Test Cases:**

```typescript
describe('POST /api/register/group', () => {
  describe('Step 0 — Validation', () => {
    it('rejects invalid JSON', () => { /* 400 */ })
    it('rejects invalid Zod body', () => { /* 400 with issues */ })
  })

  describe('Step 0b — Group Position Validation', () => {
    it('rejects group with 6+ players', () => { /* 400 */ })
    it('rejects group with 2 setters', () => { /* 400 with issues */ })
    it('accepts group with valid positions', () => { /* proceeds */ })
    it('maps middle_setter to setter count', () => { /* test countPositions logic */ })
  })

  describe('Step 0c — Team Position Validation', () => {
    it('rejects team with <6 players', () => { /* 400 */ })
    it('rejects team missing setter', () => { /* 400 with missing */ })
    it('accepts team with valid lineup', () => { /* proceeds */ })
  })

  describe('Step 1 — Auth', () => {
    it('returns 401 when user null', () => { /* 401 */ })
  })

  describe('Step 1b — Player Resolution', () => {
    it('resolves existing player from UUID', () => { /* user_id set */ })
    it('returns error when existing user not found', () => { /* resolution.error */ })
    it('reuses guest with existing email', () => { /* user_id set, no new auth */ })
    it('creates new guest and auth user', () => { /* user_id set from new user */ })
    it('propagates guest creation auth error', () => { /* resolution.error */ })
    it('propagates guest insertion error', () => { /* resolution.error */ })
  })

  describe('Step 2 — Duplicate Detection', () => {
    it('rejects when player already registered', () => { /* 400 with results */ })
  })

  describe('Step 3 — Batch Insert', () => {
    it('returns 500 on registrations insert error', () => { /* 500 */ })
  })

  describe('Step 4 — Team Creation', () => {
    it('returns 500 on teams insert error', () => { /* 500 */ })
    it('returns 500 on team_members insert error', () => { /* 500 */ })
  })

  describe('Success', () => {
    it('returns 200 with all results success:true', () => { /* 200 */ })
  })
})
```

---

#### 4B — `src/app/api/admin/register/route.ts`

**Test File:** `src/app/api/admin/register/__tests__/route.test.ts`

**Mocking Strategy:** Identical to 4A.

**Key Differences from Group Route:**

| Aspect | Group | Admin |
|--------|-------|-------|
| Auth | Any authenticated user | Only admin + super_admin |
| Player count min | 2 for group, 6 for team | 1 (single mode allowed) |
| Position validation | Enforced | Skipped |
| payment_status | N/A | Set by admin, defaults to pending |
| registration_mode | group, team | single, group, team |
| Team creation | Always (if group/team mode) | Conditional: only if group/team mode |

**Test Cases:**

| Scenario | Expected Response |
|----------|------------------|
| Non-admin caller (`role: 'player'`) | 403 |
| Facilitator caller | 403 |
| Admin caller | Proceeds |
| Super-admin caller | Proceeds |
| `registration_mode: 'single'` + 1 player | Accepted (team NOT created) |
| `registration_mode: 'group'` + 2 players | Team IS created |
| `registration_mode: 'team'` + 6 players | Team IS created with name including "Team" suffix |
| Invalid body | 400 with Zod errors |
| Player resolution steps | Same as group route (existing, guest reuse, guest create) |
| Duplicate detection | Same as group route |
| Registrations insert error | 500 |
| Team insert error (only for group/team) | 500 |
| Team member insert error | 500 |
| Success | 200 with results array |

---

### Phase 4 Execution

**Run Command:**
```bash
npx vitest run src/app/api/register src/app/api/admin
```

**Verify:**
```bash
npm run test:coverage
```

Check coverage targets (85%/90%/80% for Phase 4 files).

---

## Phase 5 — React Hook

**Status:** Optional, lower priority (requires additional dependency)
**Estimated Tests:** ~12
**Coverage Target:** Lines 85%, Functions 85%
**Time to Write:** 1–2 hours
**Time to Run:** ~1 second

### When to Do Phase 5

- After Phases 1–4 are complete and passing
- If component integration tests are planned (Phase 5 validates the hook's core logic)
- If time permits; the hook is a thin wrapper and most behavior is indirect

### Pre-Phase 5 Setup

**Install test dependency:**
```bash
npm install --save-dev @testing-library/react
```

### Target File

#### 5 — `src/lib/hooks/useSupabaseQuery.ts`

**Test File:** `src/lib/hooks/__tests__/useSupabaseQuery.test.ts`

**File Requirement:** Add `// @vitest-environment jsdom` at the top (enables DOM and React rendering).

**Mocking Strategy:**
- `vi.mock('sonner')` — mock `toast.error` function

**Hook:** `useSupabaseQuery<T>(options)`

**Test Cases:**

| Scenario | Verification |
|----------|--------------|
| Initial state | `{ data: null, error: null, isLoading: false }` |
| During `execute` call | `isLoading: true` while awaiting |
| Successful query (result.error falsy) | `data` set, `error` cleared, `isLoading: false` |
| Failed query (result.error truthy) | `error` set to friendly message, `data: null`, `toast.error` called |
| Failed query with `showToast: false` | Same but `toast.error` NOT called |
| Exception thrown during query | Caught, `error` set to friendly message, `toast.error` called |
| Stale update prevention | Second `execute` call completes first while first pending → first result discarded via `executionId !== ref` check |

---

### Phase 5 Execution

**Run Command:**
```bash
npx vitest run src/lib/hooks
```

---

## Phase 6 — Schedule Label

**Status:** Optional (can run anytime after Phase 1)
**Estimated Tests:** ~5
**Coverage Target:** 100% lines, 100% functions, 100% branches
**Time to Write:** 15 minutes
**Time to Run:** <100ms

### Target File

#### 6 — `src/lib/utils/schedule-label.ts`

**Test File:** `src/lib/utils/__tests__/schedule-label.test.ts`

**Mocking Strategy:** None. Import real `formatScheduleDateWithWeekday` and `formatScheduleTime` from `timezone.ts` (already tested in Phase 1).

**Function:** `formatScheduleLabel(schedule: ScheduleWithLocation) → string`

**Test Cases:**

```
✓ Full object with all fields → "Location Name · Fri, Mar 20 · 7:00 PM – 9:00 PM"
✓ Separator is ` · ` (space-dot-space)
✓ schedule.locations is null → "Unknown Location · ..."
✓ schedule.locations.name is empty string → "(empty) · ..."
✓ Verify format consistency with timezone helpers
```

---

### Phase 6 Execution

Can run anytime after Phase 1 (no dependencies on other phases):

```bash
npx vitest run src/lib/utils/__tests__/schedule-label.test.ts
```

---

## Coverage Summary by Phase

| Phase | Files | Est. Tests | Target | Dependency |
|-------|-------|-----------|--------|-----------|
| Pre | (infrastructure) | 0 | — | None |
| 1 | 5 utility/constant modules | ~80 | 100% | None |
| 2 | 7 Zod schemas | ~75 | 100% | None |
| 3 | 1 middleware + 5 API routes | ~70 | 90%/85% | Pre + Phase 1–2 |
| 4 | 2 complex API routes | ~65 | 85%/90%/80% | Phase 3 |
| 5 | 1 React hook | ~12 | 85% | Phase 1 + `@testing-library/react` |
| 6 | 1 utility composition | ~5 | 100% | Phase 1 |
| **Total** | | **~307** | | |

---

## Test Execution Commands

### Run by Phase

```bash
# Pre-phase: setup infrastructure only (no tests)
# Phase 1
npx vitest run src/lib/utils src/lib/errors src/lib/constants src/lib/config

# Phase 2
npx vitest run src/lib/validations

# Phase 3
npx vitest run src/lib/middleware src/app/api/registrations src/app/api/users src/app/api/profile src/middleware.test.ts

# Phase 4
npx vitest run src/app/api/register src/app/api/admin

# Phase 5 (optional, requires @testing-library/react)
npx vitest run src/lib/hooks

# Phase 6 (optional, can run anytime)
npx vitest run src/lib/utils/__tests__/schedule-label.test.ts
```

### Run All Tests

```bash
# Single run (CI-style)
npm run test

# Coverage report
npm run test:coverage

# Watch mode (local development)
npm run test:watch
```

---

## Common Issues & Troubleshooting

### ICU Timezone Issues (Phase 1)

**Problem:** Tests fail with "Unknown timezone: Asia/Manila"

**Solution:** Verify Node.js has full ICU:
```bash
node -e "console.log(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))"
```

If it fails, your Node.js build lacks ICU. In CI, add ICU data:
```bash
# In .github/workflows or equivalent
npm install -g full-icu
export NODE_ICU_DATA=/usr/share/icu
```

### Mock Not Intercepting Calls (Phase 3+)

**Problem:** `vi.mocked(createServiceClient)` returns undefined or original function

**Solution:**
1. Ensure `src/__tests__/setup.ts` is listed in `vitest.config.mts` `setupFiles`
2. In your test file, call the mock setup **before** importing the route:
   ```typescript
   vi.mocked(createServiceClient).mockReturnValue(createMockServiceClient())
   ```
3. Import the route **after** the mock is configured

### Stale Mock State Between Tests

**Problem:** Test 1 mocks fail for Test 2

**Solution:** Use `beforeEach` to reset mocks:
```typescript
beforeEach(() => {
  vi.clearAllMocks()
})
```

### TypeScript Errors in Tests

**Problem:** `vi.mocked()` returns `never` type or loses type information

**Solution:** Use `as any` (acceptable in tests) or install `@vitest/expect-ext`:
```typescript
const mock = vi.mocked(createServiceClient) as any
```

---

## Feature Log

| Date | Phase | Files | Description |
|------|-------|-------|-------------|
| 2026-03-19 | 3 | 6 test files | Phase 3 complete: profile-cache, registrations routes, profile/complete, users/search, middleware (445 total tests passing) |
| 2026-03-18 | — | docs/TESTING.md | Initial unit test plan created with 6 phases and ~307 tests |

---

## Next Steps

1. **Pre-Phase:** Create the three helper files + update `vitest.config.mts`
2. **Phase 1:** Implement timezone, position-slots, messages, labels, branding tests (target: complete by EOD +1)
3. **Phase 2:** Implement all 7 Zod schema tests (target: complete by EOD +2)
4. **Phase 3:** Implement mocked routes and middleware (target: complete by EOD +4)
5. **Phase 4:** Implement complex routes with full business logic (target: complete by EOD +6)
6. **Phases 5–6:** Optional; prioritize based on time and component integration test needs

---

**Document Version:** 1.0
**Last Updated:** 2026-03-18
**Maintainer:** Development Team
