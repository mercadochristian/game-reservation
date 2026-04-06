# Functional Overview

> Plain-language feature guide for stakeholders. For technical details, see [CODEBASE.md](CODEBASE.md).

**Last Updated:** 2026-04-06

---

## What This App Does

The **Volleyball Game Reservation System** is a web platform that manages game reservations and player registrations for volleyball clubs. Administrators schedule games and manage players end-to-end; players browse upcoming games and register; facilitators handle game-day operations including attendance scanning and team lineups.

---

## User Roles

### Admin
- Create, edit, and delete game schedules (date, time, location, capacity, skill level, pricing)
- Manage game venues/locations
- View and manage all player registrations across all schedules
- Verify or reject player payment submissions
- Register players directly for a game on their behalf
- Manage accepted payment methods (GCash, bank transfer, etc.) with optional QR code images
- View all users, filter by role and status, and ban or unban accounts
- Edit user roles and skill levels
- View system activity logs

### Facilitator
- Scan player QR codes at game start to mark attendance per schedule

### Player
- Browse upcoming game schedules on the public calendar
- Register for games in solo, group, or team mode
- Upload payment proof during registration
- View all past and upcoming registrations with QR codes for check-in
- Manage their own profile (name, contact info, skill level, emergency contact)
- Accept the liability waiver before registering

---

## Key Features

### Live

**Game Schedules**
Admins create game sessions with date, location, max players, number of teams, skill level requirements, and per-position pricing. Schedules move through statuses: Open → Full → Completed (or Cancelled). Players see upcoming games in an interactive public calendar with live spot counts per position. Clicking a position badge shows who has already registered for that slot.

**Player Registration**
Three modes are available:
- **Shuffle** — Individual player registers solo; assigned to a team by the facilitator on game day.
- **Group** — One player registers 2–5 teammates together. Each gets a position assignment. The group stays together when lineups are built.
- **Team** — One player registers a complete team of 6+ with a minimum required lineup (1 setter, 2 middle blockers, 2 open spikers, 1 opposite spiker).

All modes require a completed player profile, a waiver acceptance, and payment proof upload.

**Payment Tracking**
Players upload a payment proof screenshot during registration. Admins review the proof on the payments dashboard and mark the status as reviewed, paid, or rejected. Admins can also edit payment details (amount, reference number, notes) when correcting records. The system uses AI to extract the amount, reference number, and sender from payment screenshots to assist admin review.

**QR Code Attendance**
Each registered player receives a unique QR code. On game day, facilitators open the scanner page, select the schedule, and scan each player's QR code to mark them as attended. The scanner shows payment status alongside attendance so facilitators can flag unpaid players at the door.

**Registrations Dashboard**
Admin-only view showing all registrations at a location, split into upcoming and past game sections. Filterable by date range. Admins can verify payments, edit registrations, reassign teams, and manage lineups directly from this view.

**Team and Lineup Builder**
Before game day, admins use the drag-and-drop lineup builder to assign registered players to teams. Solo players drag individually; group registrations drag as a block and cannot be split. Team names are customizable. Once saved, the assigned team appears on each player's registration record.

**User Management**
Admins view all users with filter chips by role (admin, facilitator, player) and status (active, banned). Each user entry shows role badge, skill level, and account status. Admins can:
- Edit a user's role or skill level
- Ban an account (sets a `banned_at` timestamp; the user is immediately redirected to a "banned" message on next request)
- Unban an account (clears the timestamp; user regains access)

**Activity Logs**
Super-admins view a full audit trail of system events: registrations, payments, attendance marks, bans, and errors. Each log entry includes the action, level, user, timestamp, and structured metadata.

**Waiver**
Players must accept the liability waiver before they can register for any game. The waiver checkbox is enforced at the registration step — it cannot be bypassed.

**Payment Channels**
Admins manage the list of accepted payment methods shown to players during registration. Each channel includes a provider name (GCash, Maya, BDO, etc.), account number, account holder name, and an optional QR code image. Channels can be activated or deactivated.

**Profile Management**
All users can edit their profile at any time from `/dashboard/profile`: name, phone, birthday, gender, skill level, and emergency contact. Profile data is required to be complete before accessing the dashboard.

**My Registrations**
Players view all their past and upcoming game registrations in one place. Upcoming games show the QR code for check-in and current payment status. Past games show attendance status.

**Admin Player Registration**
Admins can register any player (including guest players) for a game directly from the registrations dashboard or from `/dashboard/register`. Supports solo, group, and team modes. Admins set payment status manually.

---

### Coming Soon

**Promotions**
Offer discounts (BOTO or percentage) to specific game schedules. Admin-controlled; displayed on schedule cards during registration.

**Announcements**
Admins create and broadcast announcements to users. Target by role. Users see an announcement center in their dashboard.

**PWA (Progressive Web App)**
Installable app experience on mobile devices with push notifications for registration reminders.

**Webhooks**
External system integration via webhook events (registration created, payment verified, attendance marked).

---

## User Journeys

### New Player Onboarding
1. Visits `/auth` and signs up with email + password
2. Completes profile at `/create-profile` (name, birthday, skill level, contact info, emergency contact)
3. Redirected to dashboard
4. Reviews and accepts the waiver at `/waiver` before first registration
5. Browses available games on dashboard
6. Registers for a game (solo or group), uploads payment proof
7. Admin verifies payment
8. Attends game — facilitator scans their QR code to mark attendance

### Group Registration
1. One player (the group leader) navigates to registration for a schedule
2. Selects Group mode and adds teammates by name or searches existing users
3. Assigns a preferred position to each person
4. Submits and uploads payment proof for the group
5. Admin verifies payment; all group members appear in the registrations dashboard

### Admin — Creating a Schedule
1. Navigates to `/dashboard/schedules`
2. Clicks "New Schedule"
3. Sets date/time, location, max players, number of teams, per-position prices, and any skill level requirements
4. Saves — game appears on the public calendar immediately

### Admin — Verifying a Payment
1. Player registers and uploads payment screenshot
2. Admin navigates to `/dashboard/payments`
3. Reviews the payment proof (with AI-extracted amount and reference number highlighted)
4. Marks as paid or rejected; optionally adds a payment note
5. Player's registration status updates

### Admin — Registering a Player
1. Admin navigates to the registrations dashboard or `/dashboard/register`
2. Searches for a player by name or email (or creates a guest)
3. Selects a schedule and registration mode
4. Submits and sets payment status as needed
5. Player appears in the schedule's registrations list

### Facilitator — Game Day
1. Opens `/dashboard/scanner`
2. Selects the day's schedule
3. Scans each player's QR code as they arrive
4. Scanner marks attendance and shows payment status
5. Players who are not paid are flagged

---

## Registration Modes

| Mode | Who Registers | Player Count | Requirements |
|------|--------------|-------------|-------------|
| Shuffle | Individual | 1 | None |
| Group | One person for a group | 2–5 | Max 1 setter, 1 opposite, 2 middle blockers, 2 open spikers |
| Team | One person for a full team | 6+ | Min 1 setter, 2 middle blockers, 2 open spikers, 1 opposite spiker |

---

## Data & Privacy

**What we collect:**
- Players: name, email, phone, birthday, gender, skill level, emergency contact, payment proof images, game history
- Facilitators/Admins: name, email, role, action logs

**Where it's stored:**
- User profiles: encrypted database
- Payment proofs: private file storage (players access only their own files)
- Activity logs: database (visible to admins/super_admins only)

**Who sees what:**
- Players see only their own profile and registrations
- Admins see all player data, registrations, payments, and logs
- Facilitators see game rosters and attendance only
- The public can see game schedule availability (no personal info)

---

## Feature Log

| Date | Feature | Description |
|------|---------|-------------|
| 2026-04-06 | E2E Test Suite (Playwright) | Playwright infrastructure added with authenticated session fixtures, login tests, and GitHub Actions CI workflow |
| 2026-04-03 | User Management Redesign | Users page redesigned with filter chips (by role and ban status), role badges, and improved layout |
| 2026-04-03 | Ban/Unban Users | Admins can ban accounts (sets `banned_at`); banned users are immediately redirected to a ban message on login; admins can unban to restore access |
| 2026-04-02 | Admin Registration Dialog | Admin can register a player (solo/group/team) directly from the registrations dashboard |
| 2026-04-01 | Registration & Payment Notes | Players add optional 200-char notes at registration (write-once). Admins can add/edit 200-char notes on payment records |
| 2026-03-29 | Registrations Dashboard (merged view) | Unified dashboard showing all registrations at a location split into upcoming/past sections. Filterable by date range. Role-based actions (admin vs facilitator) |
| 2026-03-29 | QR Code Attendance Scanner | Facilitators and admins scan player QR codes on game day to mark attendance. Shows payment status alongside attendance |
| 2026-03-28 | My Registrations (Player View) | Players view all past and upcoming registrations with QR codes for check-in and attendance/payment status |
| 2026-03-26 | Profile Page | All users can edit their own profile from the dashboard nav |
| 2026-03-26 | Lineup Builder | Drag-and-drop tool for assigning players to game-day teams. Groups drag as a unit; solo players drag individually. Team names are customizable |
| 2026-03-20 | Rate Limiting | In-memory sliding-window rate limiting on registration and payment-proof endpoints |
| 2026-03-19 | Atomic Group Registration | Group registration uses a Postgres transaction RPC to atomically insert all registrations and payment in one operation, preventing partial or duplicate registrations |
| 2026-03-19 | Real-Time Position Availability | Public calendar shows live spot counts per position. Clicking a position badge lists the names of already-registered players |
| 2026-03-18 | Waiver | Players must accept the liability waiver before registering for a game |
| 2026-03-18 | User Auth & Onboarding | Email + password sign-up, profile completion, role-based access |
| 2026-03-18 | Game Schedule Management | Admins create, edit, soft-delete game schedules with location, capacity, pricing, and skill requirements |
| 2026-03-18 | Location Management | Admins manage game venues with address, map link, and notes. Soft-delete preserves historical data |
| 2026-03-18 | Game Registration (Solo/Group/Team) | Players register for games individually or in groups/teams with position assignment and payment proof upload |
| 2026-03-18 | Payment Tracking & Verification | Payment proof upload, AI extraction of amount/reference, admin approve/reject workflow |
| 2026-03-18 | Payment Channels Management | Admin configures accepted payment methods with provider, account details, and optional QR code image |
| 2026-03-18 | Public Game Calendar | Unauthenticated visitors can browse upcoming games and see spot availability |
| 2026-03-18 | Activity Logs | Admins view an audit trail of system events with level, action, user, and metadata |
| 2026-03-18 | Safe Delete for Venues and Schedules | Deleting a location or schedule archives it (`deleted_at`) rather than destroying it; past registration and payment records are preserved |
| 2026-03-18 | QR Code Generation | Each registered player receives a unique QR token for game-day check-in |
