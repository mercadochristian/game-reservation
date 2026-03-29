# Merged Registrations Dashboard Redesign

**Date**: 2026-03-29
**Goal**: Reduce friction in viewing and managing registrations by merging all games at a location into a single, grouped view instead of requiring per-game selection.

---

## Problem Statement

Current dashboard/registrations page requires multiple clicks to view registrations:
1. Filter by date/location
2. Select a specific game from the schedule grid
3. View that game's registrations table

For users managing multiple games at one location, this adds unnecessary navigation overhead. The goal is to show all registrations at a location in one view, grouped by game.

---

## Solution Overview

**Merged Registrations Dashboard** displays all games at a selected location with their registrations grouped into collapsible card sections. This eliminates the per-game selection step while keeping data organized and scannable.

### Key Design Decisions

1. **Location as Primary Filter** — Required entry point. User must select a location to load any data.
2. **Date Range Filter** — Optional secondary filter to narrow games within a location.
3. **Games Grouped by Date/Time** — Collapsible card sections, each containing one game's registrations.
4. **Spacious Card-Style Layout** — Clear visual separation between games, with left accent bar for visual hierarchy.
5. **Rich Columns** — Player, Position, Skill Level, Payment Status, Team Assignment visible at a glance.
6. **Mixed Actions** — Quick inline actions (view details, mark attendance) + context menu for complex operations (reassign, delete, verify payment).

---

## Data Model & Schema

No database changes required. Leverages existing `schedules`, `registrations`, `users`, and `teams` tables.

**Query Output:**
- All schedules at the selected location (filtered by date range if provided)
- For each schedule, all registrations with user, skill level, payment status, team membership

**Sorting:**
- Games: chronological (earliest first)
- Registrations within each game: by registration date (newest first)

---

## User Interface

### Layout Structure

```
┌─────────────────────────────────────────────────┐
│  Location Filter [Dropdown]  Date Range [...]   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ═ UPCOMING GAMES (3)                          │
│                                                 │
│  ┌─ Mon, Mar 31 · 6:00 PM @ North Court ▼ 8   │
│  │  [Registrations Table]                      │
│  │  - Sarah Chen  | Setter    | Advanced | Paid│
│  │  - Mike J...   | Spiker    | Inter... | Review
│  │                                             │
│  │  [Register Player] [Manage Lineups]         │
│  │                                             │
│  ┌─ Wed, Apr 2 · 7:30 PM @ North Court ▼ 12  │
│  │  [Registrations Table]                      │
│  │  - Alex Rivera | Middle    | Beginner| Paid │
│  │  - Jordan Lee  | Libero    | Advanced| Pend │
│  │                                             │
│  │  [Register Player] [Manage Lineups]         │
│  │                                             │
│  [Pagination: 1 2 3]                           │
│                                                 │
│  ═ PAST GAMES (15) ▼                           │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Components

#### 1. Filter Bar (Top)
- **Location dropdown** (required, triggers data fetch)
- **Date range picker** (optional, "Last 30 days" / "All" / custom range)
- **Status**: Count badge showing total registrations across all games

#### 2. Upcoming Games Section
- **Header**: "UPCOMING GAMES (N)" with count
- **Content**: Game group cards (collapsible, expanded by default)
- **Pagination**: Show 5-10 games per page, pagination controls at bottom
- **Empty State**: "No upcoming games at [location]"

#### 3. Past Games Section
- **Header**: "PAST GAMES (N)" with count, collapsible toggle (▶/▼, collapsed by default)
- **Content**: Game group cards (when expanded)
- **Pagination**: Show 5-10 games per page, pagination controls at bottom
- **Disabled Actions**: [Register Player] and [Manage Lineups] buttons hidden for past games
- **Empty State**: "No past games at [location]"

#### 4. Game Group Card (Repeating)
- **Header**: Date, time, location name, collapsible toggle (▼/▶), registration count
- **Accent bar**: Left-side 4px colored border (blue, teal, or based on status)
- **Registrations table** (when expanded):
  - Columns: Player Name | Position | Skill Level | Payment Status | Team
  - Hover state: Slight background change on rows
  - Click row: Context menu or details dialog
  - No pagination within game (show all registrations for that game)

#### 5. Action Buttons (Per-Game)
Located below registrations table within the game card:
- **[Register Player]** — Opens dialog to add players to this game
- **[Manage Lineups]** — Navigates to lineup assignment page for this game
- *Only show if game is upcoming (not in the past)*

#### 6. Row Actions (Per-Registration)
**Inline (visible)**:
- Click row → opens player details panel or context menu

**Context Menu** (right-click or action button):
- View full details (skill level, contact info, team mates)
- Mark attendance (QR scan or checkbox) — only for upcoming/today's games
- Reassign to different team
- Verify payment (if user is admin)
- Delete registration (if user is admin)
- Edit (if user is admin)

---

## Data Display

### Registrations Table Columns

| Column | Type | Notes |
|--------|------|-------|
| Player Name | Text | First + Last name, with "Guest" badge if applicable |
| Position | Badge/Text | Setter, Open Spiker, etc. |
| Skill Level | Badge/Text | Beginner, Intermediate, Advanced |
| Payment Status | Badge | Pending (outline), Review (secondary), Paid (success), Rejected (destructive) |
| Team | Text | Team name or "Unassigned" |

### Filtering & Sorting

- **Location**: User-selected (required)
- **Date Range**: Optional filter on schedule `start_time`
- **Game Sections**:
  - **Upcoming**: Games with `start_time` >= now, ordered chronologically (earliest first)
  - **Past**: Games with `start_time` < now, ordered reverse chronologically (most recent first)
- **Registration Order**: By creation date within each game (newest first)

### Empty States

- **No location selected**: "Select a location to view games"
- **No games at location**: "No games scheduled at [location] in the selected date range"
- **No registrations for a game**: Game card shows "No registrations yet" with register button

---

## Interactions & Workflows

### Viewing Registrations (Primary Flow)
1. User selects location from dropdown
2. Page loads all games at location (grouped by date)
3. User expands/collapses game sections as needed
4. User can click registrations to see details, mark attendance, etc.

### Registering New Players
1. User clicks [Register Player] button within a game card
2. Dialog opens (same as current registration dialog)
3. After submission, registrations table updates for that game

### Managing Lineups
1. User clicks [Manage Lineups] button within a game card
2. Navigates to `/dashboard/lineups/{scheduleId}` (existing page)
3. Upon return, merged view reflects any team assignment changes

### Verifying Payment (Admin Workflow)
1. User scans registrations for "Review" or "Pending" payment badges
2. Clicks registration → context menu → "Verify Payment"
3. Dialog/inline action allows approve/reject
4. Payment status updates in-table

### Marking Attendance (Facilitator Workflow)
1. During game, user opens merged view for the location
2. Expands today's game section
3. Clicks registrations to mark attendance (QR scan or checkbox)
4. Attendance data persists

---

## Role-Based Visibility

- **Admin**: All games, all registrations, all actions (register, manage lineups, verify payments, delete)
- **Facilitator**: Upcoming and today's games, all registrations for those games. Can mark attendance, view details. Cannot verify payments or delete.
- **Player**: No access to this page. Players view their own registrations via `/dashboard/my-registrations`.

---

## Performance Considerations

- **Initial Load**: Query schedules at location + registrations. Separate queries for upcoming vs past games.
- **Pagination**:
  - Upcoming games: Paginate at 5-10 games per page (default to first page)
  - Past games: Paginate at 5-10 games per page, collapsed by default (lazy-load on expand)
- **Collapsed Sections**: Past games section is collapsed by default, only expands/loads when user clicks header.
- **Registrations Table**: Content hidden but not removed from DOM (CSS `display: none`). Toggle is instant.
- **Optimization**: Past games section can be loaded on-demand to reduce initial payload size.

---

## Component Reusability

**New Components Created**:
1. **RegistrationsGroupCard** — Renders a single game's registration section (collapsible header + table). Reusable in other views.
2. **RegistrationActionsMenu** — Context menu for per-registration actions. Reusable for single-game views.

**Existing Components Leveraged**:
- `Table`, `TableHeader`, `TableRow`, `TableCell` (UI primitives)
- `Badge` (payment status, position, skill level)
- `Dialog` (register players, verify payment)
- `Button` (actions)
- `GameFilter` (location/date selection) — may be refactored or replaced with new filter bar

---

## Testing Strategy

### Unit Tests
- Filter logic (location selection, date range filtering)
- Collapsible toggle state
- Action handlers (register, mark attendance, etc.)

### Integration Tests
- Query performance with many games/registrations
- Real-time updates when a registration is added/deleted
- Role-based visibility (admin vs facilitator)

### User Tests
- Verify location-first mental model matches user expectations
- Confirm grouping is scannable and useful
- Test context menu discoverability

---

## Migration Path (If Needed)

Current single-game view (`/dashboard/registrations?scheduleId=...`) remains available for deep-linking and detail work. New merged view is the default landing page.

---

## Success Metrics

1. **Reduced clicks**: Users can see all games at a location without per-game selection (3 clicks → 1-2 clicks).
2. **Faster scanning**: Grouped layout helps identify games needing attention quickly.
3. **Fewer page navigations**: No need to bounce between schedule selection and registration tables.
4. **Maintains current functionality**: All admin/facilitator workflows still work (register, lineups, attendance, payments).

---

## Open Questions / Future Enhancements

1. **Bulk Actions**: Should users be able to select multiple registrations across games and bulk-verify payments or reassign teams? (Out of scope for MVP, but consider for future)
2. **Real-time Updates**: Should registrations update live when another admin registers a player? (Nice-to-have, depends on infra)
3. **Sorting Options**: Users may want to sort registrations by payment status (unpaid first). Consider adding sort toggles.
4. **Favorites/Pinned Games**: Frequently-used games could be pinned to top. (Nice-to-have)
