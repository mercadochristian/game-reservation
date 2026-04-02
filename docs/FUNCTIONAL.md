# Functional Reference — Volleyball Game Reservation System

> For stakeholders: plain-language overview of what the system does, how it works, and who uses it.

---

## What Is This System?

The **Volleyball Game Reservation System** is a web platform that manages game reservations and player registrations for volleyball clubs. Members can sign up with email/password, browse upcoming games, register themselves or entire teams, and check in via QR codes on game day. Administrators manage game schedules, locations, and player profiles. Facilitators oversee on-court operations and attendance tracking.

---

## User Roles

### 🔐 Admin
**Who:** Club leadership, system operators

**Can do:**
- Create, edit, delete game schedules (date, time, location, team count, skill level requirements)
- Manage game venues/locations
- View all player registrations and payment statuses
- Approve/reject player profiles
- Review activity logs and system errors
- Manage facilitator and admin accounts

**Access:** Dashboard, Locations management, Schedules management

**Admin page experience improvements:**
- All admin list pages show an animated loading placeholder (skeleton rows) while data is being fetched, so the page layout does not jump when records appear
- Filter controls on list pages are hidden by default inside a collapsible panel to keep the page clean; the panel header shows how many filters are currently active

---

### 👥 Facilitator
**Who:** Game-day staff, match coordinators

**Can do:**
- ✅ Build and finalize game-day lineups (assign players to teams and positions)
- ✅ View game rosters and team assignments
- 🔄 Mark players as present/absent via QR code scanning (coming soon)
- 🔄 Award MVP (most valuable player) to standout players (coming soon)
- View upcoming games and player details

**Access:** Dashboard, Lineup Builder, QR scanner (coming soon), MVP awards (coming soon)

---

### ⚽ Player
**Who:** Volleyball club members

**Can do:**
- Browse upcoming games on a calendar
- Register for games (solo or as part of a group/team)
- View their own game schedule and confirmation details
- Update their profile (name, skill level, contact info, emergency contact)
- Generate a QR code for check-in on game day

**Access:** Dashboard, Game calendar, Game registration

---

## Key Features

### 📅 Game Schedule Management
Admins create game sessions with:
- **Date & Time** — when the game happens
- **Location** — which venue (gym, court, etc.)
- **Number of Teams** — how many teams will play (usually 2 for a single match)
- **Player Capacity** — how many total players can register
- **Skill Level Requirements** — minimum or specific skill levels required to play
- **Status** — Open (accepting registrations), Full (at capacity), Cancelled, Completed

Players see upcoming games in an interactive calendar view with:
- Live counts of available spots per position (open spiker, setter, middle blocker, opposite spiker) — these update automatically as registrations come in
- Clicking a position badge opens a details panel showing who has already registered for that position slot
- Estimated teams that will form
- Location and timing details

---

### 🏟️ Location Management
Admins create and maintain a list of game venues with:
- **Name** — facility name (e.g., "City Sports Complex")
- **Address** — physical location
- **Google Maps Link** — for easy navigation
- **Notes** — parking, access info, special instructions
- **Active Status** — whether the location is currently in use

---

### 📋 Player Registration (Three Modes)

#### Solo Registration
A single player registers for one or more games independently. On game day, the facilitator assigns them to a team.

#### Group Registration
One player registers 2+ friends/teammates for the same game. **They must have a valid team composition** (see below). They stay together as a group when teams are formed.

#### Team Registration
One player registers a complete, position-assigned team. **Must have a valid team composition** (see below). The team plays together as-is.

**All modes require:**
- A completed player profile (name, contact info, skill level, emergency contact)
- Payment proof (e.g., screenshot of bank transfer) uploaded
- Preferred position selection (for group/team modes)

---

### 💰 Payment Tracking
Players submit proof of payment (photo/screenshot) during registration. Admins can:
- View payment status (pending, submitted for review, approved, rejected)
- Access payment proof images
- Mark payments as reviewed/approved

---

### 📝 Registration & Payment Notes

**Players** can add optional context notes when registering (max 200 characters). These notes are visible only to the player in their registrations dashboard and are write-once (not editable).

**Admins** can add or edit notes when manually correcting payment information (max 200 characters). Payment notes appear in the payment table as a separate column and are editable.

**Use Cases:**
- **Registration Notes:** Player explains their team preference, position flexibility, or special requirements during registration
- **Payment Notes:** Admin documents why a payment was flagged for review, tracks investigation progress, or notes payment corrections

**Constraints:**
- Both notes limited to 200 characters (plain text only)
- Registration notes: write-once (cannot be edited after registration)
- Payment notes: editable by admins anytime
- Validation at three layers: client-side, Zod schema, database CHECK constraint

---

### ⚙️ Lineup Builder
**For admins and facilitators before the game**

Before game day, admins or facilitators build the official lineup to assign players to teams. The **Lineup Builder** is a drag-and-drop tool accessible from the registrations page:

1. **Select a game** from the registrations view
2. **Click "Set Lineup"** to open the builder
3. **See all registered players:**
   - **Unassigned pool** on the left shows all players not yet assigned
   - Solo players (registered alone) drag individually
   - Group players (registered together) drag as a block — they stay together in whatever team you assign them
4. **Team columns** on the right show game-day teams (e.g., "Team 1", "Team 2")
   - Customize team names by clicking to edit
5. **Drag players** from the pool to team columns
   - Drop individual players one at a time
   - Drop entire groups together (they don't split)
6. **Save** when lineup is finalized
   - This records the official team assignments for the game
   - Registrations page updates to show assigned teams

**Benefits:**
- Clear visualization of who plays where before the game
- No need to manually assign teams on game day — it's already done
- Group members guaranteed to stay together
- Facilitators have official roster when match starts

---

### 📋 Registrations Dashboard (Merged View)
**Roles:** Admin, Facilitator
**Access:** `/dashboard/registrations`

Unified dashboard showing all registrations at a location, split into upcoming/past game sections with location-first filtering and pagination.

**Workflow:**

1. **Select Location** — User navigates to Registrations dashboard
   - Must select a location from dropdown (required to proceed)
   - Dashboard displays all games at that location

2. **View Upcoming Games** (expanded by default)
   - Shows all games with future start times
   - Games displayed with full registration details
   - Paginated: 10 games per page
   - Can collapse individual game cards

3. **View Past Games** (collapsed by default, expandable)
   - Shows all games with past start times
   - Games collapsed to save space, click to expand
   - Paginated: 10 games per page
   - Read-only view (no action buttons)

4. **Filter by Date Range** (optional)
   - **All** — Show all games at location
   - **Last 7 Days** — Show only games from past 7 days
   - **Last 30 Days** — Show only games from past 30 days

5. **Manage Individual Registrations** (upcoming games only)
   - For each player in a game's registration table:
     - **View Details** — Opens player details panel
     - **Mark Attendance** — Records attendance (facilitator only)
     - **Reassign Team** — Moves player to different team (admin only)
     - **Verify Payment** — Confirms payment received (admin only)
     - **Edit/Delete** — Modify or remove registration (admin only)

6. **Set Lineup** (upcoming games only)
   - Click "Set Lineup" on a game card to open the Lineup Builder
   - Assign players to teams before the game
   - Teams display in the registration table after assignment

7. **Register New Players** (upcoming games only)
   - Click "Register Player" to add solo/group/team registrations
   - Admin can register players on behalf of others

**Facilitators** see:
- Location filter + date range filter
- All game cards with registration tables
- Mark Attendance action (upcoming games)
- No payment verification or edit/delete actions

**Admins** see:
- Location filter + date range filter
- All game cards with registration tables
- All actions: Mark Attendance, Reassign Team, Verify Payment, Edit, Delete
- Manage Lineups action

**Benefits:**
- Location-first view for venue managers
- See all registrations without switching between games
- Upcoming/past separation reduces clutter
- Pagination keeps page responsive
- Role-based actions prevent accidental operations

---

### 🎫 Game Check-In
On game day, players show their unique QR code (generated at registration) to the facilitator. The QR code contains:
- Player name and contact info
- Game details (location, time)
- Assigned position and team (from the lineup)

Facilitators use a QR scanner to:
- Check players in quickly
- Confirm they're registered
- Track attendance

---

### 🏆 MVP Awards
Post-game, facilitators award MVP to standout players. This is used for:
- Recognizing top performers
- Building player statistics over time
- Motivating engagement

---

## User Journeys

### New Player Onboarding
1. Visit the website
2. Click "Create Account" and enter email + password
3. Create account (password confirmation required)
4. Automatically signed in
5. Complete profile: name, birthday, skill level, contact info, emergency contact
6. Redirected to dashboard
7. Ready to register for games

### Playing a Game (Solo Mode)
1. Browse calendar of upcoming games
2. Click a game to see details: location, time, available spots
3. Click "Register"
4. Select preferred position (if team-based)
5. Upload payment proof
6. Submit registration
7. Receive confirmation + QR code
8. On game day: show QR code at check-in

### Group Registration
1. Gather friend list (email addresses)
2. Click "Register for Game"
3. Toggle "Group Mode"
4. Search for and add each friend (or add as guest)
5. Assign positions to each group member
6. Upload single payment proof for group
7. Submit
8. All players receive confirmation

### Admin Creating a Schedule
1. Login to admin dashboard
2. Click "Manage Schedules"
3. Click "New Schedule"
4. Enter: game title, date, time, location, number of teams, skill level requirements
5. Save
6. Game appears in public calendar
7. Players can now register

---

## Registration Modes Explained (Plain Language)

| Mode | Who Registers | How Many Players | Requirements | Best For |
|---|---|---|---|---|
| **Shuffle** | Individual | 1 | None | Casual players |
| **Group** | One person | 2+ friends together | Must have valid volleyball lineup | Friends playing as unit |
| **Team** | One person | 2+ players | Must have valid volleyball lineup | Organized teams |

### Position Rules by Registration Mode

#### Group Mode (Flexible)
- **Player count:** 2–5 players
- **Position limits (no minimums, only maximums):**
  - Setter: max 1
  - Opposite Spiker: max 1
  - Middle Blocker: max 2
  - Open Spiker: max 2

**Examples:**
- ✅ 1 Setter + 1 Open Spiker (2 players) — OK
- ✅ 2 Middle Blockers + 1 Opposite Spiker (3 players) — OK
- ✅ 1 Setter + 2 Middle Blockers + 2 Open Spikers (5 players) — OK
- ❌ 2 Setters (exceeds max 1) — NOT OK
- ❌ 3 Open Spikers (exceeds max 2) — NOT OK
- ❌ 6 players (exceeds group max of 5) — NOT OK

#### Team Mode (Strict Minimum)
- **Player count:** 6+ players (minimum)
- **Required minimum lineup:**

| Required Position | Minimum Count |
|---|---|
| Setter | 1 |
| Middle Blocker | 2 |
| Open Spiker | 2 |
| Opposite Spiker | 1 |

- **No position maximums** — can have any number of players in each position (e.g., 5 open spikers is valid)

**Examples:**
- ✅ 1 Setter + 2 Middle Blockers + 2 Open Spikers + 1 Opposite Spiker (6 players minimum) — OK
- ✅ 1 Setter + 2 Middle Blockers + 3 Open Spikers + 1 Opposite Spiker (7 players, extra bench) — OK
- ✅ 1 Setter + 2 Middle Blockers + 4 Open Spikers + 2 Opposite Spikers (10 players, bench included) — OK
- ❌ 2 Open Spikers + 1 Opposite Spiker (only 3 players, missing setter & MB) — NOT OK
- ❌ 5 players total (minimum 6 required) — NOT OK

---

## Data & Privacy

### What Data We Collect

**From Players:**
- Name, email, phone number, birthday, gender, skill level
- Emergency contact (name, relationship, phone)
- Payment proof (screenshots/photos)
- Game attendance history
- Performance (MVP awards)

**From Facilitators & Admins:**
- Name, email, role
- Action logs (what they did, when)

### Where It's Stored
- **User profiles** — encrypted in database
- **Payment proofs** — secure private file storage
- **Activity logs** — server logs (admins only)

### Who Sees What
- **Players** see only their own profile and registrations
- **Admins** see all player data, registrations, and logs
- **Facilitators** see game rosters and attendance only
- **The public** can see game schedule and availability (no personal info)

---

## Status of Key Features

### ✅ Fully Implemented & Live
- **User Authentication** — Magic link sign-in, role-based access
- **Profile Management** — Players create and edit profiles with skill level, contact info, emergency contact
- **Game Schedule Management** — Admins create, edit, delete game schedules with location and capacity
- **Location Management** — Admins manage venues with maps integration
- **Game Registration** — Players register solo, in groups, or as teams with position validation
- **Registrations Admin View** — Admins view all registrations for each game with filtering by date and location
- **Payments Admin View** — Admins review and approve/reject payment submissions with payment channel management
- **My Registrations (Player)** — Players view all their registrations (past and upcoming) with QR codes
- **My Profile (Player)** — Players edit their profile after initial setup
- **Lineup Builder** — Admins/facilitators organize registered players into game-day teams with drag-and-drop
- **QR Code Generation** — Players receive unique QR codes for game check-in
- **Activity Logs** — Admins view system activity logs
- **Merged Registrations Dashboard** — Admins and facilitators view all registrations at a location with location-first filtering, upcoming/past game separation, and role-based actions

### 🔄 Coming Soon (Scaffolded Pages)
- **QR Scanner** — Facilitators scan QR codes to mark attendance on game day
- **Award MVP** — Facilitators award post-game MVP to standout players

---

## Feature Log

A record of implemented features. Updated as new features are deployed.

| Date | Feature | Description |
|---|---|---|
| 2026-03-18 | User Auth & Onboarding | Magic link sign-in, player profile creation |
| 2026-03-18 | Game Schedule Management | Admins can create, edit, delete game schedules |
| 2026-03-18 | Location Management | Admins can manage game venues |
| 2026-03-18 | Game Registration (Solo/Group/Team) | Players can register for games individually or in groups |
| 2026-03-18 | QR Code Generation | Players receive unique QR codes for check-in |
| 2026-03-18 | Public Game Calendar | Players and public can browse upcoming games |
| 2026-03-18 | Team Composition Validation | Group: min 1 max 2 per position. Team: strict complete lineup per team size. |
| 2026-03-18 | Registration Mode Refinement | Group: 2–5 players, per-position max. Team: 6+ players, minimum lineup only (no max). |
| 2026-03-18 | Error Handling & Reliability | Database/network errors now show user-friendly messages with retry actions instead of silent failures. Schedule, locations, and dashboard pages show "Try Again" when data fails to load. |
| 2026-03-18 | Timezone Centralization | All date/time displays now consistently use Manila time (UTC+8) from a single shared utility, eliminating scattered timezone logic and reducing the risk of display bugs as the app grows. |
| 2026-03-18 | Database Performance Improvements (#39) | Added database indices to speed up player name search, position filtering, and role-based queries as data grows. No change to visible functionality. |
| 2026-03-18 | Safe Delete for Venues and Schedules (#38) | Deleting a location or game schedule now archives it rather than destroying it permanently. Past registration records, payment history, and attendance data are fully preserved. Admins can view and restore archived items. |
| 2026-03-19 | Real-Time Position Availability | The public game calendar now shows live spot counts per position on each game card. Counts update automatically as players register. Clicking a position badge opens a panel listing the names of players who have already claimed that slot. |
| 2026-03-19 | Admin Page UX Improvements | Admin list pages (locations, schedules, registrations) now display animated placeholder rows while data loads, preventing layout jumps. Filter controls are collapsed by default into a toggle panel that shows the number of active filters in its label. |
| 2026-03-26 | Lineup Builder | Admins and facilitators can now organize registered players into game-day teams before each game using an interactive drag-and-drop interface. Solo players drag individually; group registrations drag together as a unit. Team names are customizable. Once saved, the lineup appears in the registrations list and ensures everyone knows their assigned team before game day. |
| 2026-03-28 | My Registrations (Player View) | Players can now view all their past and upcoming game registrations in one place. Shows game details, location, payment status, QR codes for check-in on upcoming games, and attendance status for completed games. Available from the main dashboard for all authenticated users. |
| 2026-03-29 | Merged Registrations Dashboard | New admin view combining all registrations with location-first filtering and grouped games by time. Enables admins to manage payments and lineup assignments more efficiently. |
| 2026-04-01 | Registration & Payment Notes | Players can add optional 200-character notes during registration (visible to player, write-once). Admins can add/edit 200-character notes on payment records for context during payment reviews and corrections. |
| 2026-04-03 | User Ban Support | Soft-ban functionality adds a nullable `banned_at` timestamp to user profiles. When set, the user is marked as banned; when NULL, the user is active. Enables admin control of player access without deleting accounts. |
| 2026-04-03 | Unban user API route | Recovery action: admins can clear the banned_at timestamp to reactivate a banned user. Complements the ban functionality for complete access control. |

