# Unit Test Implementation Plan — Remaining Phases

This document tracks the remaining phases of the unit test plan for the volleyball reservation system. **Phase 1 (Infrastructure) has been completed.** See below for Phases 2–6.

---

## ✅ Phase 1 — Infrastructure (COMPLETED)
- ✅ Installed `vitest`, `@vitest/coverage-v8`
- ✅ Created `vitest.config.mts` with path alias and coverage settings
- ✅ Added test scripts to `package.json`: `test`, `test:watch`, `test:coverage`
- ✅ Verified `npm run test` runs successfully

**Next**: Start Phase 2 (Validation Schemas)

---

## 📋 Phase 2 — Validation Schemas (Highest ROI, Pure Zod)

**File**: `src/lib/validations/__tests__/`

### `auth.test.ts` — `loginSchema`
| Test | Expected |
|------|----------|
| valid email + 6-char password | success |
| empty email | error: 'Please enter your email address' |
| non-email string | error: 'Please enter a valid email address' |
| empty password | error: 'Please enter your password' |
| 5-char password | error: 'Password must be at least 6 characters' |
| 6-char password (boundary) | success |
| 72-char password (boundary) | success |
| 73-char password | error: 'Password must be fewer than 72 characters' |

### `location.test.ts` — `locationSchema`
| Test | Expected |
|------|----------|
| minimal valid `{ name, is_active }` | success |
| null optional fields | success |
| valid `google_map_url` | success |
| `name: ''` | error: 'Location name is required' |
| `name` 256 chars | error (max 255) |
| `google_map_url: 'not-a-url'` | error: 'Must be a valid URL' |
| `google_map_url: ''` | error (empty string fails url()) |
| `google_map_url: undefined` | success |

### `schedule.test.ts` — `scheduleSchema` + `teamRosterSchema`

**`scheduleSchema`**:
| Test | Expected |
|------|----------|
| valid all fields, end > start | success |
| end_time === start_time | error: 'End time must be after start time' |
| end_time < start_time | error: 'End time must be after start time' |
| `location_id: 'not-uuid'` | error: 'Location is required' |
| `num_teams: 1` | error: 'At least 2 teams required' |
| `num_teams: 2` | success |
| invalid status enum | error |
| invalid required_levels value | error |

**`teamRosterSchema`** (highest complexity):
| Test | Expected |
|------|----------|
| 5 valid positions | error: 'A team requires at least 6 players' |
| Valid lineup: 2 OS, 1 OPP, 2 MB, 1 S | success |
| Valid lineup order shuffled | success |
| Missing 1 open_spiker | fail |
| With extra setter | fail |
| With extra middle_blocker | fail |
| All 6 players are open_spiker | fail |
| Invalid lineup with wrong position counts | fail |
| Invalid position string | Zod enum error |
| Empty array | error: 'A team requires at least 6 players' |

### `profile.test.ts` — `onboardingSchema`
| Test | Expected |
|------|----------|
| complete valid submission | success |
| `player_contact_number: '+63' + 10 digits` | success |
| `player_contact_number: '09171234567'` (no +63) | fail |
| `player_contact_number: '+63123'` (too short) | fail |
| `birthday_year: 1899` | fail: 'Year must be 1900 or later' |
| `birthday_year: 1900` | success |
| `birthday_year: new Date().getFullYear()` | success |
| `birthday_year: new Date().getFullYear() + 1` | fail: 'Year cannot be in the future' |
| `birthday_year: undefined` | success (optional) |
| `birthday_month: 0` / `13` | fail |
| `birthday_day: 0` / `32` | fail |
| `skill_level: 'expert'` | fail: 'Please choose your skill level' |
| all 5 valid skill levels | each success |

### `user-search.test.ts` — `userSearchSchema`
| Test | Expected |
|------|----------|
| `q: 'ab'` (2 chars, boundary) | success |
| `q: 'Juan dela Cruz'` (space ok) | success |
| `q: 'user@email.com'` (@ and . ok) | success |
| `q: "O'Brien"` (apostrophe ok) | success |
| `q: 'a'` (1 char) | error: 'Search query must be at least 2 characters' |
| `q: 'a'.repeat(101)` | error: 'Search query must be fewer than 100 characters' |
| `q: 'name; DROP TABLE'` | error: 'Search query contains invalid characters' |
| `q: 'test<script>'` | error |
| `q: '**wildcard**'` | error |

### `group-registration.test.ts` — `groupPlayerSchema` (union) + `groupRegistrationSchema`

**groupPlayerSchema**:
| Test | Expected |
|------|----------|
| valid existing player | success |
| `user_id: 'bad-id'` | error: 'User ID must be a valid UUID' |
| invalid position enum for existing | error |
| valid guest player | success |
| `first_name: ''` for guest | error: 'First name is required' |
| `email: 'not-email'` for guest | error: 'Invalid email address' |
| `last_name` > 100 chars | error |

**groupRegistrationSchema**:
| Test | Expected |
|------|----------|
| valid with 2 players | success |
| `schedule_id: 'not-uuid'` | error: 'Schedule ID must be a valid UUID' |
| `players: [1 player]` | error: 'At least 2 players required' |
| `registration_mode: 'solo'` | enum error |
| `payment_proof_path: ''` | error: 'Payment proof path is required' |

---

## 🕐 Phase 3 — Timezone Utilities

**File**: `src/lib/utils/__tests__/timezone.test.ts`

Reference UTC anchor: `'2026-03-20T06:30:00+00:00'` = 2:30 PM Manila, Friday March 20 2026

| Function | Input | Expected |
|----------|-------|----------|
| `formatScheduleDate` | anchor UTC | 'Friday, March 20, 2026' |
| `formatScheduleDate` | '2026-03-19T16:00:00Z' | 'Friday, March 20, 2026' (UTC midnight boundary) |
| `formatScheduleDate` | `''` | `''` |
| `formatScheduleDate` | `new Date(anchor)` | same as string |
| `formatScheduleDateShort` | anchor | 'Mar 20, 2026' |
| `formatScheduleDateShort` | `''` | `''` |
| `formatScheduleDateWithWeekday` | anchor | 'Fri, Mar 20' |
| `formatScheduleTime` | anchor | '2:30 PM' |
| `formatScheduleTime` | '2026-03-20T00:00:00Z' | '8:00 AM' (UTC midnight = Manila 8 AM) |
| `formatScheduleDateTime` | anchor | 'Mar 20, 2026, 2:30 PM' |
| `toManilaDateKey` | '2026-03-19T16:00:00Z' | '2026-03-20' (after Manila midnight) |
| `toManilaDateKey` | '2026-03-19T15:59:00Z' | '2026-03-19' (before Manila midnight) |
| `toManilaDateKey` | `''` | `''` |
| `getTodayManilaKey` | pinned to UTC 15:30 March 19 | '2026-03-20' (already next day in Manila) |
| `getNowInManila` | pinned to `'2026-03-20T00:30:00Z'` | `.getDate() === 20`, `.getHours() === 8` |
| `manilaInputToUTC` | '2026-03-20T14:30' | '2026-03-20T14:30:00+08:00' |
| `manilaInputToUTC` | `''` | `''` |
| `utcToManilaInput` | anchor UTC | '2026-03-20T14:30' |
| `utcToManilaInput` | '2026-03-19T16:00:00Z' | '2026-03-20T00:00' |
| `utcToManilaInput` | `''` | `''` |

**Use `vi.useFakeTimers()` + `vi.setSystemTime()`** for time-dependent tests. Reset with `afterEach(() => vi.useRealTimers())`.

---

## 💬 Phase 4 — Error Messages

**File**: `src/lib/errors/__tests__/messages.test.ts`

| Input | Expected |
|-------|----------|
| `null` | FALLBACK_ERROR_MESSAGE |
| `undefined` | FALLBACK_ERROR_MESSAGE |
| `{ code: 'PGRST116' }` | 'The requested record could not be found.' |
| `{ code: 'PGRST301' }` | 'Your session has expired. Please sign in again.' |
| `{ code: '42501' }` | 'You do not have permission to perform this action.' |
| `{ code: '23505' }` | 'This record already exists.' |
| `{ code: 'UNKNOWN' }` | FALLBACK_ERROR_MESSAGE |
| `{ error_code: 'invalid_credentials' }` | 'Invalid email or password.' |
| `{ error_code: 'user_banned' }` | 'Your account has been suspended.' |
| `{ message: 'Payload too large - file exceeds limit' }` | 'The file is too large to upload.' |
| `{ message: 'Invalid mime type: exe' }` | 'This file type is not supported.' |
| `{ message: 'over_email_send_rate_limit' }` | 'Too many emails sent. Please wait a few minutes.' |
| `new Error('fetch failed')` | 'A network error occurred…' |
| `new Error('timeout exceeded')` | 'The request timed out. Please try again.' |
| `{ someOtherField: 'data' }` | FALLBACK_ERROR_MESSAGE |
| `'a raw string'` | FALLBACK_ERROR_MESSAGE |

---

## 📚 Phase 5 — Labels & Branding

### `labels.test.ts` — `SKILL_LEVEL_LABELS`, `POSITION_LABELS`, `STATUS_LABELS`
- Each has correct key count (5, 5, 4)
- Each key maps to correct display string
- No undefined values

### `branding.test.ts` — `getBrandingMeta`
- Returns `{ title, description }` object
- Both fields are non-empty strings
- `branding.colors.primary` matches `/^#[0-9a-fA-F]{6}$/`

---

## 🔧 Phase 6 — Position Validation Helpers (after refactor)

**IMPORTANT**: Before this phase, extract 4 private functions from `src/app/api/register/group/route.ts` into `src/lib/utils/position-validation.ts`:
- `getRequiredPositions()`
- `countPositions(players)`
- `validateTeamPositions(players, required)`
- `validateGroupPositions(players)`

Then update `route.ts` to import from `position-validation.ts`.

**File**: `src/lib/utils/__tests__/position-validation.test.ts`

### `countPositions`
- Empty array → all zeros
- Counts all 4 position types: setter, open_spiker, opposite_spiker, middle_blocker
- Mixed positions → correct aggregation

### `validateTeamPositions`
- Exact required count met → `{ valid: true }`
- Missing setter → `{ valid: false, missing: [{ position: 'setter', required: 1, provided: 0 }] }`
- Extras beyond minimum allowed → `{ valid: true }`

### `validateGroupPositions`
- All within max limits → `{ valid: true }`
- 2 setters → `{ valid: false, issues: [...] }`
- Multiple violations → all reported in `issues` array

### `getRequiredPositions`
- Returns `{ setter: 1, middle_blocker: 2, open_spiker: 2, opposite_spiker: 1 }`

---

## Summary

| Phase | Status | Files | Approx Tests |
|-------|--------|-------|--------------|
| 1. Infrastructure | ✅ DONE | vitest.config.mts, package.json | 0 |
| 2. Validation Schemas | ⏳ Next | auth, location, schedule, profile, user-search, group-registration | ~55 |
| 3. Timezone Utilities | 📋 Queued | timezone.test.ts | ~18 |
| 4. Error Messages | 📋 Queued | messages.test.ts | ~14 |
| 5. Labels & Branding | 📋 Queued | labels.test.ts, branding.test.ts | ~12 |
| 6. Position Validation | 📋 Queued | position-validation.test.ts (+ refactor) | ~8 |
| **TOTAL** | | **10 files** | **~107 tests** |

---

## Running Tests

```bash
# Run all tests
npm run test

# Watch mode (auto-rerun on file changes)
npm run test:watch

# Generate coverage report (open coverage/index.html)
npm run test:coverage
```

**Target coverage**: ≥90% lines, ≥90% functions, ≥85% branches.

---

## Quick Start for Phase 2

1. Create `src/lib/validations/__tests__/auth.test.ts` with ~8 test cases
2. Test against `src/lib/validations/auth.ts` (or create if missing)
3. Repeat for location, schedule, profile, user-search, group-registration
4. Run `npm run test` and verify all pass
5. Move to Phase 3

Good luck! 🚀
