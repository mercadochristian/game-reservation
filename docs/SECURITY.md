# Security Analysis — Volleyball Game Reservation System

**Status:** Security review completed
**Date:** 2026-04-01
**Scope:** Full-stack app (Next.js, React, Supabase)

This document captures security findings from a code review performed from an attacker's perspective. 12 vulnerabilities were identified, ranging from critical auth bypasses to low-risk issues.

---

## Findings Summary

| # | Severity | Category | File | Status |
|---|----------|----------|------|--------|
| 1 | CRITICAL | Auth bypass | `src/app/api/admin/payment-channels/upload-qr/route.ts` | 🔴 OPEN |
| 2 | HIGH | Open redirect | `src/middleware.ts`, `src/app/auth/page.tsx` | 🔴 OPEN |
| 3 | HIGH | Race condition | `src/app/api/register/group/route.ts` | 🔴 OPEN |
| 4 | HIGH | Authorization | `src/app/api/payment-proof/extract/route.ts` | 🔴 OPEN |
| 5 | MEDIUM | Scope bypass | `src/app/api/admin/lineups/route.ts` | 🔴 OPEN |
| 6 | MEDIUM | Information disclosure | `src/app/api/registrations/by-position/route.ts` | 🔴 OPEN |
| 7 | MEDIUM | DoS | `src/app/api/registrations/counts/route.ts` | 🔴 OPEN |
| 8 | MEDIUM | Account takeover | `src/lib/services/guest-user.ts` | 🔴 OPEN |
| 9 | MEDIUM | Information disclosure | `src/app/api/users/search/route.ts` | 🔴 OPEN |
| 10 | LOW | Log injection | `src/app/api/logs/error/route.ts` | 🔴 OPEN |
| 11 | LOW | Fail open | `src/middleware.ts` | 🔴 OPEN |
| 12 | LOW | Missing documentation | `.env.example` | 🔴 OPEN |

---

## 1. CRITICAL — Auth Bypass on QR Upload

**File:** [src/app/api/admin/payment-channels/upload-qr/route.ts](../src/app/api/admin/payment-channels/upload-qr/route.ts)

### Attack

An attacker can upload arbitrary files to your `payment-qrcodes` storage bucket without authentication.

```bash
curl -X POST https://your-app.com/api/admin/payment-channels/upload-qr \
  -H "Authorization: Bearer fakebearertoken" \
  -F "file=@malicious.html"
```

### Root Cause

The route accepts any non-empty `Authorization` header without verifying it:

```ts
const authHeader = req.headers.get('authorization')
if (!authHeader) {
  return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
}
// Never calls getUser() or verifies the token
```

Then uses the **service client** (which bypasses all RLS policies) to write to storage. Any string in the header is accepted.

### Impact

- Arbitrary file upload to storage
- Potential for malicious QR codes, HTML injection, or disk space exhaustion
- Service client bypasses all security controls

### Fix

```ts
const serviceClient = createServiceClient()
const serverClient = await createClient()

// 1. Verify auth token against Supabase
const { data: { user }, error: authError } = await serverClient.auth.getUser()
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// 2. Check user role
const { data: profile } = await serviceClient
  .from('users')
  .select('role')
  .eq('id', user.id)
  .single()

if (!['admin', 'super_admin'].includes(profile?.role)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// 3. Continue with upload
```

---

## 2. HIGH — Open Redirect via `returnUrl`

**Files:** [src/middleware.ts:107-113](../src/middleware.ts#L107-L113), [src/app/auth/page.tsx:61,99,111](../src/app/auth/page.tsx#L61)

### Attack

An attacker crafts a phishing link:

```
https://your-app.com/auth?returnUrl=//attacker.com/fake-login
```

A legitimate user logs in, then is redirected to the attacker's fake login page to harvest credentials. The same vulnerability exists client-side in `router.push(returnUrl)`.

### Root Cause

The only guard is checking if `returnUrl` starts with `/auth`. This fails for:
- `//evil.com` — protocol-relative URL (resolves to `https://evil.com`)
- `https://evil.com` — absolute URL
- `/\evil.com` — some URL parsers treat this as external

### Impact

- Credential harvesting via phishing redirection
- User trust violation
- No rate limiting on open redirect attempts

### Fix

```ts
// Helper to safely validate returnUrl
const isSafeRedirect = (url: string): boolean =>
  url.startsWith('/') && !url.startsWith('//')

// In middleware:
const rawReturnUrl = request.nextUrl.searchParams.get('returnUrl')
const returnUrl = rawReturnUrl && isSafeRedirect(rawReturnUrl)
  ? rawReturnUrl
  : '/dashboard'

// Also fix in src/app/auth/page.tsx:
const safeReturnUrl = isSafeRedirect(returnUrl) ? returnUrl : '/dashboard'
router.push(safeReturnUrl)
```

---

## 3. HIGH — Race Condition on Slot Booking (TOCTOU)

**Files:** [src/app/api/register/group/route.ts:83-105,288-291](../src/app/api/register/group/route.ts#L83-L105), [src/app/api/admin/register/route.ts](../src/app/api/admin/register/route.ts)

### Attack

An attacker sends 5 concurrent registration requests for a 5-slot event, each registering 2 players. All 5 requests pass the slot-count check before any insert, resulting in 10 players registered for 5 slots.

```bash
for i in {1..5}; do
  curl -X POST .../api/register/group \
    -d '{"schedule_id":"<uuid>","players":[{"email":"p1@x.com"},{"email":"p2@x.com"}]}' &
done
```

### Root Cause

The availability check and insert are two separate, non-atomic operations with many async steps in between (guest user creation, etc.). No transaction wraps them.

```ts
// Step 1: Check slots
const { count: existingRegistrationCount } = await serviceClient
  .from('registrations').select('*', { count: 'exact', head: true })
  .eq('schedule_id', validated.schedule_id)

if (slotsRemaining < validated.players.length) return 400 // ← Anyone can pass this

// Step 2-N: Create guest users, log, etc. (async delay)

// Step N+1: Insert registrations
await serviceClient.from('registrations').insert(registrationInserts) // ← Race condition
```

### Impact

- Event over-capacity
- Broken inventory management
- Frustration for legitimate players who can't register
- Payment disputes

### Fix

Use a Postgres transaction with a row-level lock:

```ts
// Option 1: Call an RPC function that does this atomically
const { data, error } = await serverClient.rpc('register_players', {
  p_schedule_id: validated.schedule_id,
  p_players: validated.players,
  p_user_id: authUser.user.id,
})

// In your Supabase migration (SQL):
create or replace function register_players(
  p_schedule_id uuid,
  p_players jsonb,
  p_user_id uuid
) returns json as $$
begin
  lock table schedules in row exclusive mode;

  -- Check slot count
  declare v_slots_remaining int;
  select max_players - count(*) into v_slots_remaining
    from schedules s
    left join registrations r on r.schedule_id = s.id
    where s.id = p_schedule_id
    for update;

  if v_slots_remaining < jsonb_array_length(p_players) then
    raise exception 'Not enough slots available';
  end if;

  -- Insert registrations
  insert into registrations (schedule_id, user_id, ...) values (...);

  return json_build_object('success', true);
end
$$ language plpgsql;
```

Or add a database constraint (trigger):

```sql
CREATE OR REPLACE FUNCTION check_registration_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM registrations
    WHERE schedule_id = NEW.schedule_id
  ) >= (
    SELECT max_players FROM schedules WHERE id = NEW.schedule_id
  ) THEN
    RAISE EXCEPTION 'Schedule is full';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER registration_limit_check
BEFORE INSERT ON registrations
FOR EACH ROW
EXECUTE FUNCTION check_registration_limit();
```

---

## 4. HIGH — Payment Proof Ownership Not Verified

**File:** [src/app/api/payment-proof/extract/route.ts:17-35](../src/app/api/payment-proof/extract/route.ts#L17-L35)

### Attack

Any authenticated user can overwrite another user's payment record with fake extracted data.

```json
POST /api/payment-proof/extract
{
  "user_payment_id": "<victim's payment UUID>",
  "payment_proof_url": "payment-proofs/victim-original.jpg"
}

// Response: Victim's payment amount is now changed to attacker's chosen value
```

### Root Cause

The route accepts a `user_payment_id` UUID but never checks that it belongs to the authenticated user:

```ts
const { user_payment_id, payment_proof_url } = body

// No ownership check — any UUID is accepted
const serviceClient = createServiceClient()
// ... calls AI extraction ...
await serviceClient
  .from('registration_payments')
  .update({ extracted_amount: extractedAmount })
  .eq('id', user_payment_id)
```

### Impact

- Payment fraud
- Another user's payment amount can be reduced or falsified
- Admin approval of fraudulent payments
- Revenue loss

### Fix

```ts
const { user_payment_id, payment_proof_url } = body

const serverClient = await createClient()
const { data: { user: authUser }, error: authError } = await serverClient.auth.getUser()

if (authError || !authUser) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// **Verify ownership** — the payment must belong to this user's registration
const { data: payment, error: paymentError } = await serverClient
  .from('registration_payments')
  .select('id, registrations(user_id)')
  .eq('id', user_payment_id)
  .single()

if (!payment || payment.registrations?.user_id !== authUser.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Safe to proceed with extraction
const serviceClient = createServiceClient()
// ... rest of logic ...
```

---

## 5. MEDIUM — Facilitator Can Overwrite Any Lineup

**File:** [src/app/api/admin/lineups/route.ts:42-58](../src/app/api/admin/lineups/route.ts#L42-L58)

### Attack

A facilitator logs in and overwrites lineups for games they are not assigned to, disrupting game logistics.

### Root Cause

The route allows `facilitator` role but doesn't check if the facilitator is assigned to the schedule:

```ts
if (!['admin', 'super_admin', 'facilitator'].includes(profile.role)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Then accepts any schedule_id from the body with no scope check
```

### Impact

- Malicious facilitators can corrupt game lineups
- Disrupted game logistics and poor UX
- Admin authority violated

### Fix

Option A (admin-only): Remove `facilitator` from allowed roles.

Option B (scope-check): Verify facilitator is assigned to the schedule:

```ts
if (profile.role === 'facilitator') {
  // Check if facilitator is assigned to this schedule
  const { data: assignment, error: assignError } = await serverClient
    .from('schedule_facilitators')
    .select('id')
    .eq('schedule_id', body.schedule_id)
    .eq('user_id', authUser.user.id)
    .single()

  if (assignError || !assignment) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}
```

---

## 6. MEDIUM — Public Player PII Exposure

**File:** [src/app/api/registrations/by-position/route.ts](../src/app/api/registrations/by-position/route.ts)

### Attack

An attacker enumerates all player names for any game without logging in.

```bash
curl "https://your-app.com/api/registrations/by-position?schedule_id=<uuid>&position=setter"
# Returns: [{ first_name: "Alice", last_name: "Smith" }, ...]
```

### Root Cause

This route is in `PUBLIC_ROUTES` in middleware with no authentication required. It directly returns player names:

```ts
// No auth check, listed as PUBLIC_ROUTE in middleware.ts
const registrations = await supabase
  .from('registrations')
  .select('users(first_name, last_name)')
  .eq('schedule_id', schedule_id)
  .eq('position', position)
```

### Impact

- Privacy violation — names harvested from public endpoint
- Facilitators/admins only need this data; players don't
- Mass enumeration of all registered players

### Fix

Remove from `PUBLIC_ROUTES` and require authentication:

```ts
// src/middleware.ts
const PUBLIC_ROUTES = [
  '/api/schedules',
  '/api/locations',
  '/api/registrations/counts',
  // Remove: '/api/registrations/by-position',  ← Remove this line
]

// In src/app/api/registrations/by-position/route.ts, add:
const serverClient = await createClient()
const { data: { user }, error } = await serverClient.auth.getUser()
if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

---

## 7. MEDIUM — DoS via Unbounded `schedule_ids`

**File:** [src/app/api/registrations/counts/route.ts:23-34](../src/app/api/registrations/counts/route.ts#L23-L34)

### Attack

An attacker sends a request with thousands of schedule IDs, forcing an expensive `.in()` query:

```bash
curl "https://your-app.com/api/registrations/counts?schedule_ids=$(for i in {1..5000}; do echo -n "uuid$i,"; done)"
```

### Root Cause

No limit on the number of `schedule_ids` in the comma-separated list:

```ts
const scheduleIds = raw.split(',').map((id) => id.trim()).filter(Boolean)
// No maximum check

await supabase
  .from('registrations')
  .select('schedule_id, count')
  .in('schedule_id', scheduleIds)  // ← Can be 5000+ items
```

### Impact

- Database query performance degradation
- CPU/memory exhaustion
- Denial of service for legitimate users

### Fix

```ts
const scheduleIds = raw
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

if (scheduleIds.length > 50) {
  return NextResponse.json(
    { error: 'Too many schedule IDs (max 50)' },
    { status: 400 }
  )
}

await supabase.from('registrations').select(...).in('schedule_id', scheduleIds)
```

Also add rate limiting at the edge (Vercel, nginx, or middleware).

---

## 8. MEDIUM — Guest Registration Silently Overwrites Real Accounts

**File:** [src/lib/services/guest-user.ts:46-53](../src/lib/services/guest-user.ts#L46-L53)

### Attack

An attacker registers a group and includes the admin's email as a "guest" player. The admin's real account is corrupted.

```json
POST /api/register/group
{
  "schedule_id": "...",
  "players": [
    {
      "email": "admin@example.com",
      "first_name": "Hacked",
      "last_name": "Account",
      "is_guest": true
    }
  ]
}

// Result: admin@example.com is now is_guest=true, role='player'
```

### Root Cause

When a guest email matches an existing user, the service client **overwrites** their profile:

```ts
const { data: existing } = await serviceClient
  .from('users')
  .select('*')
  .eq('email', email)
  .single()

if (existing) {
  // BUG: Overwrites real users too!
  return await serviceClient
    .from('users')
    .update({
      first_name: body.first_name,
      last_name: body.last_name,
      phone: body.phone || null,
      skill_level: body.skill_level || null,
      is_guest: true,
      role: 'player',
    })
    .eq('id', existing.id)
}
```

### Impact

- Account takeover / privilege downgrade
- Real user loses admin access
- Real user's profile data corrupted
- Guest registration allowed to modify any user

### Fix

```ts
const { data: existing } = await serviceClient
  .from('users')
  .select('is_guest')
  .eq('email', email)
  .single()

if (existing) {
  // Don't overwrite real users!
  if (!existing.is_guest) {
    return { userId: existing.id, wasCreated: false }
  }

  // Safe to update a real guest
  await serviceClient
    .from('users')
    .update({
      first_name: body.first_name,
      last_name: body.last_name,
      phone: body.phone || null,
      skill_level: body.skill_level || null,
    })
    .eq('id', existing.id)

  return { userId: existing.id, wasCreated: false }
}
```

---

## 9. MEDIUM — Any Authenticated Player Can Enumerate All User Emails

**File:** [src/app/api/users/search/route.ts:20-38](../src/app/api/users/search/route.ts#L20-L38)

### Attack

An authenticated player enumerates all user emails in the system by sending single-letter queries:

```bash
for letter in {a..z}; do
  curl "https://your-app.com/api/users/search?q=$letter"
done
```

Result: Complete email list for the entire user base.

### Root Cause

No role check on the endpoint — any authenticated user can search:

```ts
// No role check!
const { data, error } = await supabase
  .from('users')
  .select('id, first_name, last_name, email, skill_level')
  .ilike('first_name', `%${query}%`)
  .limit(10)
```

### Impact

- Email enumeration attack
- Privacy violation
- Foundation for phishing/harassment campaigns
- No authorization on sensitive endpoint

### Fix

```ts
const serverClient = await createClient()
const { data: { user: authUser }, error: authError } = await serverClient.auth.getUser()

if (authError || !authUser) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Only allow admin/facilitator/super_admin
const { data: profile } = await serverClient
  .from('users')
  .select('role')
  .eq('id', authUser.id)
  .single()

if (!['admin', 'super_admin', 'facilitator'].includes(profile?.role)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Safe to proceed with search
```

---

## 10. LOW — Log Injection

**File:** [src/app/api/logs/error/route.ts](../src/app/api/logs/error/route.ts)

### Attack

An attacker floods the logs table with garbage or injects fake audit events:

```json
POST /api/logs/error
{ "action": "user.deleted", "message": "ADMIN ACCOUNT DELETED" }

POST /api/logs/error
{ "action": "payment.verified", "message": "FRAUDULENT PAYMENT APPROVED" }
```

### Root Cause

No validation on `action` or `message` fields — any string is accepted:

```ts
const { action, message } = body
if (!action || !message) return 400

// Inserts directly without validation
await supabase.from('logs').insert({ action, message })
```

### Impact

- Audit trail pollution
- Obscured real attack activity by burying it in garbage logs
- Misleading admin visibility

### Fix

```ts
const ALLOWED_ACTIONS = [
  'auth.sign_up',
  'auth.sign_in',
  'profile.created',
  'registration.created',
  'payment.verified',
  // ... list all valid actions
]

const { action, message } = body

if (!ALLOWED_ACTIONS.includes(action)) {
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

if (!message || message.length > 500) {
  return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
}

// Rate limit per user (max 10 calls/minute)
const { count } = await supabase
  .from('logs')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', authUser.user.id)
  .gte('created_at', new Date(Date.now() - 60000).toISOString())

if (count >= 10) {
  return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
}
```

---

## 11. LOW — Middleware Silently Bypasses Auth on Error

**File:** [src/middleware.ts:139-143](../src/middleware.ts#L139-L143)

### Attack

If Supabase is temporarily unavailable, the middleware catches the exception and lets all requests through:

```ts
} catch (err) {
  void logError('middleware.unhandled', err)
  return NextResponse.next()  // ← Passes request through!
}
```

An attacker who can trigger a Supabase outage gains access to all protected routes.

### Root Cause

Fail-open error handling — on any exception, the middleware passes requests through instead of failing closed.

### Impact

- Full auth bypass during service interruptions
- Attackers can access admin/player pages
- No visibility into why auth failed

### Fix

```ts
} catch (err) {
  void logError('middleware.unhandled', err)
  // Fail closed: return error page, don't pass through
  return NextResponse.redirect(
    new URL('/auth?error=service_unavailable', request.url)
  )
}
```

---

## 12. LOW — Undocumented Required Environment Variables

**File:** [.env.example](../.env.example)

### Issue

Two required variables are used in production code but not documented in `.env.example`:

- `ANTHROPIC_API_KEY` (used in `src/app/api/payment-proof/extract/route.ts:139`)
- `MOCK_EXTRACTION` (used in `src/app/api/payment-proof/extract/route.ts:91`)

New deployments will silently fail at runtime when the payment extraction feature is used.

### Fix

Update `.env.example`:

```bash
# Anthropic API
ANTHROPIC_API_KEY=your_anthropic_api_key_here
MOCK_EXTRACTION=false
```

Also add startup validation:

```ts
// src/lib/env-check.ts
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
]

export function validateEnv() {
  const missing = requiredEnvVars.filter((v) => !process.env[v])
  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`)
  }
}

// src/app/layout.tsx or API route init:
if (typeof window === 'undefined') {
  validateEnv()
}
```

---

## Remediation Priority

Fix in this order:

1. **🔴 CRITICAL** — Auth bypass on QR upload (finding #1)
2. **🟠 HIGH** — Open redirect (finding #2)
3. **🟠 HIGH** — Payment proof ownership (finding #4)
4. **🟠 HIGH** — Race condition on slots (finding #3)
5. **🟡 MEDIUM** — Guest overwrite attack (finding #8)
6. **🟡 MEDIUM** — User search restriction (finding #9)
7. **🟡 MEDIUM** — schedule_ids limit (finding #7)
8. **🟡 MEDIUM** — Remove by-position from PUBLIC_ROUTES (finding #6)
9. **🟡 MEDIUM** — Facilitator lineup scope (finding #5)
10. **⚪ LOW** — Middleware error handler (finding #11)
11. **⚪ LOW** — Log injection prevention (finding #10)
12. **⚪ LOW** — Document env vars (finding #12)

---

## Questions / Clarifications

- Should guest registration be disabled entirely, or just better-guarded?
- Should payment extraction be rate-limited per-user?
- What are the legitimate use cases for the `/by-position` endpoint?

---

## Appendix: Verification Checklist

After fixes are deployed, verify:

- [ ] Attempt QR upload without auth header → 401
- [ ] Attempt QR upload with fake Bearer token → 401
- [ ] Verify `returnUrl=//attacker.com` redirects to dashboard instead
- [ ] Send 5 concurrent registrations for 5-slot event → only 5 register
- [ ] Attempt to extract payment for another user → 403
- [ ] Attempt to overwrite guest with real user email → account not corrupted
- [ ] Access `/by-position` without auth → 401
- [ ] Send 100 schedule IDs in counts request → 400
- [ ] Middleware is down → requests redirect to error page, not pass through
- [ ] Check `.env.example` has ANTHROPIC_API_KEY and MOCK_EXTRACTION documented
