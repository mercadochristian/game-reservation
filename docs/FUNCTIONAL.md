# Functional Reference — Volleyball Game Reservation System

> For stakeholders: plain-language overview of what the system does, how it works, and who uses it.

---

## What Is This System?

The **Volleyball Game Reservation System** is a web platform that manages game reservations and player registrations for volleyball clubs. Members can browse upcoming games, register themselves or entire teams, and check in via QR codes on game day. Administrators manage game schedules, locations, and player profiles. Facilitators oversee on-court operations and attendance tracking.

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

---

### 👥 Facilitator
**Who:** Game-day staff, match coordinators

**Can do:**
- View game rosters and team assignments
- Mark players as present/absent via QR code scanning
- Award MVP (most valuable player) to standout players
- View upcoming games and player details

**Access:** Dashboard, Team management (coming soon), QR scanner (coming soon), MVP awards (coming soon)

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
- Available spots per position (open spiker, setter, etc.)
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

### 🎫 Game Check-In
On game day, players show their unique QR code (generated at registration) to the facilitator. The QR code contains:
- Player name and contact info
- Game details (location, time)
- Assigned position

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
2. Click "Login" and enter email
3. Receive magic link via email
4. Complete profile: name, birthday, skill level, contact info, emergency contact
5. Redirected to dashboard
6. Ready to register for games

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

## Planned / Coming Soon

These features are scaffolded (pages exist but are not yet functional):

- **Registrations Admin View** — view all registrations for a game, manage approvals
- **Payments Admin View** — manage payment reviews, approve/reject submissions
- **QR Scanner** — facilitators scan QR codes to check players in
- **Team Management** — view and edit team assignments for a game
- **Award MVP** — facilitators award post-game MVP
- **My Registrations (Player)** — players view their registration history
- **My Profile (Player)** — players edit their profile after initial setup

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
| | | |

