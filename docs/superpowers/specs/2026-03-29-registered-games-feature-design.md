# Registered Games Feature Design

**Date**: 2026-03-29
**Feature**: Registered Games Section + My Registrations Page
**Status**: Design Phase

---

## Overview

Create a dedicated experience for users to view and access their registered games. This includes:

1. **Registered Games Section** (Home page) — Shows future games user is registered for, above Featured Games
2. **Registered Games Section** (Player dashboard) — Shows all games (past + future) user is registered for
3. **My Registrations Page** (`/dashboard/my-registrations`) — Comprehensive full-page view of all registrations
4. **Navigation Item** — "My Registrations" menu linking to the new page (authenticated players only)

Each section displays game details with quick access to QR codes via modal.

---

## Requirements

### Functional Requirements

**For Home Page:**
- Only visible to authenticated users
- Displays games registered for, from today onwards (no past games)
- Appears above Featured Games section
- Grid layout matching Featured Games styling
- Each card shows: date/time, location, position, with "Show QR" button
- QR code opens in modal for scanning

**For Player Dashboard:**
- Displays all registered games (past + future)
- Same card styling and QR modal functionality
- Can coexist with other dashboard sections

**For My Registrations Page (`/dashboard/my-registrations`):**
- Full-page view of all user registrations
- Accessible via new nav menu item
- Supports filtering/sorting (optional enhancement)
- Shows comprehensive registration details

**Navigation:**
- Add "My Registrations" menu item to `AppShell`
- Only visible to authenticated players
- Links to `/dashboard/my-registrations`

### Non-Functional Requirements

- Real-time updates when user registers for new games
- Dark mode support (project standard)
- Responsive design (mobile-first)
- Performance: lazy-load images, optimize queries

---

## Architecture

### Component Hierarchy

```
Home Page (src/app/page.tsx)
  └─ RegisteredGamesSection (authenticated users only, includePastGames=false)
  └─ FeaturedGamesSection

Player Dashboard (src/app/player/page.tsx)
  └─ RegisteredGamesSection (includePastGames=true)

My Registrations Page (src/app/dashboard/my-registrations/page.tsx)
  └─ MyRegistrationsPage (full-page view)

AppShell (src/components/app-shell.tsx)
  └─ Nav menu item: "My Registrations"
```

### New Components

**RegisteredGamesSection** (`src/components/registered-games-section.tsx`)
- Client component
- Props:
  - `includePastGames?: boolean` (default: false)
- State management:
  - User auth check on mount
  - Fetch user registrations filtered by date
  - QR modal open/close state
- Features:
  - Real-time subscription to registration changes
  - Grid layout (responsive columns)
  - QR code modal integration
  - Empty state handling

**RegisteredGameCard** (`src/components/registered-game-card.tsx`)
- Client component
- Props:
  - `schedule: ScheduleWithLocation`
  - `registration: Registration`
  - `onShowQR: (schedule, registration) => void`
- Display:
  - Date/time (formatted)
  - Location (name + address)
  - Position
  - "Show QR" button with icon

**MyRegistrationsPage** (`src/app/dashboard/my-registrations/page.tsx`)
- Server or client component (TBD based on data fetching needs)
- Displays all registrations in table or card grid
- Optional: filters, sorting, search

### New Page Route

**Path**: `/dashboard/my-registrations`
- Protected by auth middleware
- Layout: Uses AppShell (nav + content)
- Same styling/patterns as other dashboard pages

### Navigation Update

**File**: `src/components/app-shell.tsx`
- Add menu item: "My Registrations"
- Visibility: Only when `user?.id` exists (authenticated)
- Link: `href="/dashboard/my-registrations"`

---

## Data Flow

### RegisteredGamesSection Data Fetching

1. Component mounts → check auth status (`createClient().auth.getUser()`)
2. If user authenticated:
   - Fetch `registrations` filtered by `player_id = user.id`
   - Join with `schedules` to get game details
   - Filter by date:
     - If `includePastGames=false`: `start_time >= today`
     - If `includePastGames=true`: no filter (all games)
3. Set up Supabase real-time subscription on `registrations` table
4. On changes, refetch registrations (or incremental update)

### QR Modal

- When user clicks "Show QR" button:
  - Dispatch action to open modal with registration's QR code
  - Modal displays QR image from registration data
  - User can close modal or save QR

---

## Design Details

### RegisteredGameCard Display

```
┌─────────────────────────┐
│ Wed, Mar 29 • 7:00 PM  │
├─────────────────────────┤
│ Quezon City Sports      │
│ BGC, Metro Manila       │
├─────────────────────────┤
│ Position: Middle        │
├─────────────────────────┤
│    [Show QR →]          │
└─────────────────────────┘
```

### Grid Layout

**Home page**: 3 columns (desktop), 2 columns (tablet), 1 column (mobile)
**Dashboard**: 3 columns (desktop), 2 columns (tablet), 1 column (mobile)
**My Registrations**: Flexible (table or grid)

### Empty States

- **No registrations yet**: "You haven't registered for any games yet. [Browse upcoming games →]"
- **No past registrations**: (Only on dashboard/My Registrations) "No past games."

---

## Edge Cases & Error Handling

1. **User logs out** → Section disappears or shows login prompt
2. **Real-time registration added** → Section updates automatically
3. **Game cancelled** → Show status indicator, disable QR if necessary
4. **QR fetch fails** → Show error toast, allow retry
5. **Network error** → Graceful fallback, retry UI
6. **Unauthenticated page load** → Section not rendered (home page only)

---

## Styling & UX

- **Dark mode first**: All cards designed for dark mode primary
- **Colors**: Use project tokens (primary, secondary, destructive, etc.)
- **Animations**: Staggered fade-in using `fadeUpVariants` (project standard)
- **Accessibility**:
  - ARIA labels on buttons
  - Keyboard navigation support
  - Min 44×44px touch targets
  - 4.5:1 contrast ratio

---

## Testing

**Components to test:**
- RegisteredGamesSection (with/without past games, with/without user)
- RegisteredGameCard (QR modal open/close)
- Real-time subscription behavior
- Empty states
- Error states (fetch failures)

**Pages to test:**
- Home page with authenticated user
- MyRegistrationsPage loading and display
- Nav menu item visibility (authenticated vs unauthenticated)

---

## Migration & Deployment

**No database changes required** — uses existing `registrations` and `schedules` tables.

**Files to create:**
- `src/components/registered-games-section.tsx`
- `src/components/registered-game-card.tsx`
- `src/app/dashboard/my-registrations/page.tsx`

**Files to modify:**
- `src/app/page.tsx` — Add RegisteredGamesSection
- `src/app/player/page.tsx` — Add RegisteredGamesSection (if applicable)
- `src/components/app-shell.tsx` — Add nav menu item
- Tests for all new components

---

## Future Enhancements (Out of Scope)

- Filtering by location, date range
- Sorting (date, location)
- Search registrations
- QR code download
- Registration cancellation/management
- Attendance history

---

## Open Questions

None at this time.

---

## Future Roadmap

### Authentication & User Management
- **Forgot Password** — Enable users to reset passwords via email link
- **Data Privacy Agreement** — Require users to agree to privacy policy before profile creation
- **User Waiver** — Display and require acceptance of liability waiver during registration

### Game Operations
- **Facilitator Attendance Tracking**
  - Facilitators/admins can scan player QR codes at game start
  - System marks player as attended
  - If payment is pending, notify facilitator immediately after scan
  - Add attendance section to left nav/drawer for easy access

- **Facilitator Assignment**
  - Allow facilitators/admins to self-assign to specific game schedules
  - Track which facilitator is responsible for each game
  - Display assignment in facilitator dashboard

- **MVP Assignment**
  - Admins can assign MVP (Most Valuable Player) to any game schedule
  - Show MVP badge/designation in player dashboard
  - Display MVP details and stats in game details view

### Infrastructure & Integrations
- **Webhook Integrations** — Explore webhook use cases for:
  - Real-time payment notifications
  - Schedule updates/cancellations
  - Attendance tracking webhooks
  - External system integrations (if needed)

- **Progressive Web App (PWA)** — Convert web app to PWA for:
  - Offline access to key features
  - Install as native app capability
  - Push notifications for game updates and reminders
  - Improved mobile experience

### Payment & Billing
- **Cash Payment Option** — Enable cash payments without image uploads:
  - Players request a cash payment code from admin/super admin
  - Admin generates unique code for each cash registration
  - Registration is saved without payment image upload
  - When facilitator scans QR at game:
    - Display "Cash Payment" status on attendance screen
    - Show total amount owed for that registration
    - Facilitator can confirm cash payment received
  - Track cash payments separately in admin payment dashboard

### Promotions & Deals
- **Discount & Deal Management** — Allow admins to create promotions:
  - Percentage-based discounts (e.g., 10% off)
  - Buy 1 Take 1 deals (BOGO promotions)
  - Schedule deals to specific date ranges
  - Apply deals to specific game schedules or globally
  - Track deal usage and redemption
  - Display active deals on game cards and registration flow
  - Apply discount calculations during checkout

### Announcements & Communication
- **Announcements** — Allow admins to broadcast announcements to users:
  - Create and schedule announcements
  - Target specific user roles or all users
  - Display in dashboard banner or notification center
  - Mark as read/dismissed
  - Include announcement history

### Navigation & Dashboard
- **Dashboard Links** — Add contextual links between related pages
  - Link from game details to facilitator dashboard
  - Cross-linking between user roles and their active games
