# Homepage Redesign Spec

**Date:** 2026-03-29
**Goal:** Modernize homepage with minimalist & clean aesthetic, restructure to drive registrations via convenience-first positioning

---

## Executive Summary

Redesign the public homepage to emphasize **convenience & accessibility** for new players. The new structure shifts from generic calendar browsing to a **registration-focused funnel**: compelling hero → featured upcoming games → full calendar. Visual design adopts a **minimalist & clean** aesthetic with generous spacing, simple typography, and minimal color palette.

**Primary hypothesis:** By featuring 2-3 upcoming games prominently and emphasizing "easy to find, easy to register," we'll increase conversion from visitor to registration.

---

## Information Architecture

### Overall Page Flow (Top to Bottom)

```
1. Fixed Navbar (unchanged)
2. Hero Section (simplified)
3. Featured Games Section (NEW)
4. Full Calendar Section
5. Minimal Footer (new)
```

---

## Section Details

### 1. Fixed Navbar
**No changes from current implementation.**
- Logo + brand name on left
- Login/Dashboard button on right
- 64px height, fixed positioning
- Subtle border-bottom, clean background

---

### 2. Hero Section
**Simplified, registration-focused messaging.**

**Content:**
- Logo + app name (large, bold)
- Tagline (primary color): e.g., "Reserve Your Spot"
- Description: "Find games near you. Register in seconds. Play today." (emphasizes convenience/simplicity)
- Single CTA button: "Browse Games" (scrolls to featured games below)
- Background: Clean gradient (subtle blue-to-white or white with dot pattern) or solid white

**Layout:**
- Center-aligned text
- Large typography (h1 for name, h2 for tagline)
- Padding: pt-24 pb-16 (generous vertical spacing)
- Mobile: adjust font sizes, center alignment maintained
- Desktop: can use left-align if desired, but center is more impactful

**Removal:**
- Stats row (games this month, locations, upcoming) — removed for minimalist focus
- Secondary description text — consolidated into single description line

---

### 3. Featured Games Section (NEW)
**Showcase 2-3 upcoming games to reduce browsing friction.**

**Concept:**
Display the next 2-3 available games as clean cards, sorted by start_time (earliest first). Users immediately see game options without scrolling to calendar.

**Card Layout:**
```
┌─────────────────────────────────────────────────┐
│ Mon, Mar 31 • 7:00 PM                          │
│                                                 │
│ Makati Sports Complex                          │
│ Makati City                                    │
│                                                 │
│ 4 spots left                                   │
│                                       [Register]│
└─────────────────────────────────────────────────┘
```

**Card Content:**
- **Date & Time:** Large, bold, primary color (e.g., "Mon, Mar 31 • 7:00 PM")
- **Location Name:** Medium weight, secondary text
- **Location City/Address:** Small, muted text
- **Spots Remaining:** e.g., "4 spots left" — if 1-2 spots, highlight in warning color (e.g., orange/red)
- **Register Button:** Right-aligned, simple solid or outline style

**Card Styling:**
- White background with subtle border (1px, light gray)
- No drop shadow (minimalist)
- Padding: 24px (2rem)
- Hover state: Slight background brightness shift (not color change)
- Border-radius: 8px or less (subtle rounding)

**Layout:**
- **Desktop (≥1024px):** 3-column grid
- **Tablet (640px–1024px):** 2-column grid or single column (based on testing)
- **Mobile (<640px):** Single column, full width with side padding (16px each)

**Data Source:**
- Query `schedules` table, filter by `status = 'open'`, order by `start_time ASC`, limit 3
- Only include schedules with remaining spots > 0
- Handle edge case: if <2 games available, show what's available (don't hide section)

**Responsive Behavior:**
- On mobile, cards take full width
- Generous padding between cards (16px gap)

---

### 4. Full Calendar Section
**Unchanged from current implementation.**

- Heading: "All Games" (simple, left-aligned)
- Same calendar/schedule view as current (chronological or grid)
- Maintains all current filtering and functionality
- Styling: Updated to match minimalist aesthetic (borders, spacing, typography)

---

### 5. Minimal Footer
**New footer with social links.**

**Content:**
- Copyright text: "© 2026 [App Name]. All rights reserved."
- Social links: Facebook & Instagram (small icons or text links)
- Minimal spacing, centered or left-aligned

**Layout:**
- Simple border-top (light gray)
- Padding: 32px (vertical), 16px (horizontal)
- Center-aligned text and icons

**Styling:**
- Background: Same as page background (white)
- Text: Muted color
- Icons: Size 20-24px, subtle hover effect (opacity change)

---

## Visual Design System

### Color Palette
- **Background:** White (#FFFFFF) or very light off-white (#FAFAFA)
- **Text (Primary):** Near-black (#1A1A1A or #111827)
- **Text (Secondary):** Muted gray (#6B7280 or #757575)
- **Borders:** Light gray (#E5E7EB or #D1D5DB)
- **Accent (CTA):** Primary brand color (existing primary color)
- **Warning/Alert:** Warm color for low spots (orange/red, e.g., #EF4444 or #F97316)

### Typography
- **Headings (h1, h2, h3):** Bold, generous line-height (1.4+)
  - h1 (hero name): 48px–56px (scale up on desktop to 64px–72px)
  - h2 (section headings): 28px–32px
  - h3 (card titles): 18px–20px
- **Body text:** 16px–18px, line-height 1.6
- **Small text:** 12px–14px, line-height 1.5, muted color
- **Font family:** Use project's existing font stack (likely system fonts or a modern sans-serif like Inter)

### Spacing & Layout
- **Grid increment:** 8px or 16px (define baseline)
- **Section padding:** 24px–32px (vertical), 16px–24px (horizontal on mobile, more on desktop)
- **Card padding:** 24px
- **Gap between cards:** 16px
- **Max-width container:** 1200px (or consistent with existing pages), centered with side padding

### Borders & Shadows
- **Borders:** 1px light gray, used for card edges and section dividers
- **Shadows:** None (minimalist principle — no drop shadows or elevation)
- **Border-radius:** 8px max (subtle rounding)

### Interactions
- **Button hover:** Opacity shift (e.g., opacity 90%) or subtle background change
- **Card hover:** Slight background brightness shift (opacity or color)
- **Focus states:** 2-3px ring outline (use existing focus ring style)
- **Transitions:** 200ms ease for all hover/focus effects

### Animations
- **Page load:** Light fade-in using existing `fadeUpVariants` (staggered by section)
- **Hero elements:** Staggered fade-up (custom 0–4 for: logo, tagline, description, CTA)
- **Featured cards:** Staggered fade-up (custom 0–2)
- **Calendar:** Fade-in on Suspense completion
- **No:** Heavy animations, parallax, or unnecessary motion (minimalist)

---

## Responsive Behavior

### Breakpoints (use existing Tailwind breakpoints)
- **Mobile:** <640px (sm)
- **Tablet:** 640px–1024px (md, lg)
- **Desktop:** ≥1024px (xl, 2xl)

### Layout Adjustments
- **Navbar:** Same across all sizes (fixed 64px)
- **Hero:**
  - Mobile: center-aligned, small font sizes, no logo image (or smaller logo)
  - Desktop: can use left-align, larger font sizes
- **Featured cards:**
  - Mobile: 1 column
  - Tablet: 2 columns (or 1, based on testing)
  - Desktop: 3 columns
- **Calendar:**
  - Mobile: Compressed layout (adjust spacing if needed)
  - Desktop: Full layout
- **Footer:**
  - Mobile: Center-aligned, stacked social icons
  - Desktop: Can use flex layout (text left, icons right) or centered

---

## Edge Cases & Error States

### No Upcoming Games Available
- **Featured Games Section:** Show placeholder text ("No upcoming games at the moment. Check back soon!") instead of empty cards
- **Full Calendar:** Display empty state ("No games scheduled yet")

### Low Spots Remaining
- **Visual indicator:** If 1–2 spots left, highlight in warning color (orange/red)
- **Text:** "Only 1 spot left" (conversational, not "1 spots")

### Mobile Viewport Too Small
- **Fallback:** Single-column layout for featured cards (not responsive grid)
- **Font sizes:** Minimum 14px for body text (readability)

### Dark Mode (Future)
- **Defer to later phase** — Spec assumes light mode only
- **Note:** Use CSS custom properties for colors to enable easy dark mode addition

---

## Accessibility

- **Contrast:** All text meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- **Typography:** Generous line-height (1.5+), readable font size (16px+)
- **Buttons:** Clear focus indicators, minimum 44×44px touch targets
- **Alt text:** All images have alt text (logo, social icons)
- **Semantic HTML:** Use proper heading hierarchy (h1 > h2 > h3), <nav>, <section>, etc.
- **Keyboard navigation:** All interactive elements focusable with Tab key

---

## Performance Considerations

- **Image optimization:** Logo and social icons are SVG or optimized PNG
- **Lazy loading:** Calendar (already using Suspense) loads after hero/featured games
- **CSS:** Minimize unused styles (Tailwind purging already in place)
- **Animations:** Use `transform` and `opacity` only (GPU-accelerated)
- **Font loading:** Use system fonts or preload custom fonts if added

---

## Implementation Phases

### Phase 1: Core Redesign (Week 1)
1. Update hero section (simplified, new messaging)
2. Create featured games section (new component, card design)
3. Update footer (add social links)
4. Refine spacing and typography across page
5. Test responsive behavior

### Phase 2: Optimization (Week 2)
1. Fine-tune animations and transitions
2. Test accessibility (WCAG AA compliance)
3. Performance audit (Core Web Vitals)
4. User testing / feedback collection

---

## Success Metrics

- **Conversion:** Increased click-through from featured games (vs. current calendar browsing)
- **Engagement:** Reduced bounce rate, increased scroll depth to calendar
- **Visual:** Matches minimalist & clean design system
- **Performance:** No regress in Core Web Vitals (LCP, CLS, FID)

---

## Open Questions / Future Decisions

1. **Featured games count:** Start with 3, test if 2 is cleaner?
2. **"Spots left" threshold:** At what number do we switch to warning color? (Current spec: 1–2 spots)
3. **Social link styling:** Icons only, text + icons, or simple links?
4. **Footer alignment:** Centered or split (text left, icons right)?
5. **Dark mode:** Deferred to Phase 2 or later, but plan for CSS variables

---

## Files to Modify

- `src/app/page.tsx` — Main homepage component
- `src/components/hero-section.tsx` — Simplified hero
- `src/components/public-nav.tsx` — No changes (referenced for consistency)
- `src/components/public-calendar.tsx` — Styling updates only
- **NEW:** `src/components/featured-games-section.tsx` — New section for featured games
- **NEW:** `src/components/footer.tsx` — New footer component
- `src/lib/animations.ts` — Verify `fadeUpVariants` is available; add any new animation variants if needed
