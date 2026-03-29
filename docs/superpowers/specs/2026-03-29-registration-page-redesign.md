# Registration Page Redesign

**Date:** 2026-03-29
**Status:** Approved

---

## Context

The current registration page (`/register/[scheduleId]/register-client.tsx`) is a ~1,565-line single scrolling column capped at `max-w-lg`. It handles three registration modes (Solo, Group, Team) and already supports multi-game registration via an inline "Add another game" expand. The visual design is functional but lacks hierarchy — the running total is buried at the bottom, game context is easy to lose while scrolling, and the layout doesn't use desktop space well.

The redesign introduces a **Split Panel** layout with a persistent dark navy cart sidebar on desktop, and a cart modal on mobile. This aligns the UX with familiar checkout patterns and makes multi-game registration the first-class experience it needs to be.

---

## Layout

### Desktop (≥ 1024px)

Two-column layout filling the viewport:

**Left — Dark Navy Cart Panel (300px fixed)**
- Background: `#0f172a`
- Shows all selected games as stacked cards
- Each game card shows: venue name, address snippet, date/time, price in sky-blue (`#38bdf8`), spots remaining
- Remove (✕) button on each card
- Inline "Add another game" expand — clicking reveals a list of available open schedules directly inside the panel (dark `#020617` background). Each row: name/time, price, Add button.
- Spacer pushes total + CTA to the bottom
- Total row: "N games" label + large white total amount
- "Register →" CTA button pinned to the bottom of the panel (`#1d4ed8`)

**Right — Form Panel (flex-1)**
- Background: `#ffffff`
- Scrollable if content overflows
- Title: "Registration Details" + subtitle "Applies to all N selected games"
- Three section cards:
  1. **Registration Mode** — Solo / Group / Team segmented tabs
  2. **Your Position** — 2×2 grid of radio cards (Open Spiker, Opposite Spiker, Middle Blocker, Setter). Selected state: `border-primary bg-primary/10`
  3. **Payment** — "View Payment Channels ↗" link + dashed upload area for screenshot

### Mobile (< 1024px)

Single column, full width:

**Top nav bar** — back chevron, "Register" title, cart badge (dark `#1e293b` pill showing game count + sky-blue total). Tapping the badge opens the cart modal.

**Form body** — same three section cards as desktop, scrolls freely.

**Fixed footer bar** — dark `#0f172a`, shows "N games selected" + total on the left, "Register →" button on the right. Always visible.

**Cart Modal (bottom sheet)** — slides up when cart badge or footer total is tapped:
- Drag handle at top
- List of selected games: venue name, date/time, price, "Remove" link
- "＋ Add another game" dashed button — expands an inline list of available games directly within the modal sheet (same pattern as the desktop panel expand)
- Total row
- "Done" button to dismiss

---

## Sections Detail

### Registration Mode
Tab strip with three options: **Solo**, **Group**, **Team**.
- Solo: just position selection below
- Group: player list expands (existing player search + guest form per player, each with their own position)
- Team: player list + position requirements checklist
- Mode toggle is always visible regardless of how many games are selected

### Position Selection (Solo)
2×2 card grid. One selection required. Cards show position name + radio dot. Selected: `bg-primary/10 border-primary`.

### Player List (Group / Team)
Each player card: name, optional guest email, 2×2 position button grid. "Add Player" / "Add Member" expands an animated panel with two sub-forms: existing player (search by name) or guest (name, email, gender, skill level, phone). Team mode adds a position requirements checklist card.

### Payment
- "View Payment Channels ↗" outline button — opens in new tab
- Upload area: dashed border, upload icon, "Click to upload your payment screenshot", file type hint
- Filled state: filename + remove button

### Submit State
- CTA disabled until: position selected (solo), all players have positions (group/team), payment screenshot uploaded
- Button label: "Register →" (solo, 1 game), "Register for N Games →" (solo, multiple games), "Register N Players →" (group/team)
- On success: success screen with checkmark, game count, "Return to Calendar" button

---

## Unchanged Behavior

The following existing logic is **preserved as-is**:
- Server-side guards: auth check, already-registered redirect, skill level mismatch error, past/full/closed schedule error
- Error screen (skill mismatch or schedule guard) — card with destructive styling
- Multi-schedule support (primary + additional games)
- Guest player sub-form fields and validation
- Team position requirements checklist logic
- Payment screenshot upload (file input, preview, remove)
- `fadeUpVariants` animation pattern on section cards

---

## Files to Modify

| File | Change |
|---|---|
| `src/app/register/[scheduleId]/register-client.tsx` | Full layout rewrite — split panel shell, cart panel, form panel |
| `src/app/register/[scheduleId]/page.tsx` | No change |

No new files required. No new dependencies.

---

## Verification

1. `npm run dev` — open `/register/<any-valid-scheduleId>`
2. Desktop (≥1024px): confirm split layout renders, cart panel on left, form on right
3. Add a second game via inline expand — confirm it appears in cart, total updates
4. Remove a game via ✕ — confirm it disappears, total updates
5. Mobile (< 1024px): confirm single-column layout with footer bar
6. Tap cart badge / footer total — confirm modal sheet opens with game list
7. Select mode Solo → position selection appears
8. Select position → register button becomes active (after uploading payment)
9. Upload payment screenshot → confirm filename shown
10. Submit — confirm success screen renders
11. Group/Team mode — confirm player list expands correctly
12. `npm run lint` — no new errors
