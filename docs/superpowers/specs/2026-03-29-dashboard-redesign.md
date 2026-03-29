# Dashboard Redesign Specification

**Date:** 2026-03-29
**Scope:** Complete redesign of `/dashboard` and all sub-routes
**Goals:** Modernize, minimize confusion, improve mobile-first experience
**Design Pattern:** Approach 3 (Hamburger + Full-Screen Categories)

---

## Overview

Redesign all dashboard routes to:
- Fix user confusion about page purpose and navigation
- Implement minimalist aesthetic with clean spacing
- Adopt mobile-first approach with hamburger menu pattern
- Organize navigation by category (not flat list)
- Create role-specific landing pages with quick-action cards
- Unified structure across roles (role-based filtering, not separate dashboards)

---

## Navigation Structure

### Mobile (< 1024px)

**Fixed Top Bar (64px)**
- Left: Hamburger menu icon
- Center: Logo/branding (optional, small)
- Right: User avatar
- Bottom padding: 16px (safe area for notch)

**Hamburger Menu Modal (Full-Screen)**
- Opens when hamburger tapped
- Shows all category groups with nested sub-pages
- Example structure (Admin):
  ```
  Management
    - Users
    - Locations
    - Schedules
    - Payment Channels
  Registrations
    - Registrations
  Payments
    - Payments
  System
    - Error Logs
  ---
  Profile
  Sign Out
  ```
- Sub-pages shown indented under categories
- Tap a sub-page: closes modal, navigates to that page
- Tap outside: closes modal without navigation

**No Bottom Navigation**
- Maximizes screen real estate
- Nav only accessible via hamburger

### Desktop (≥ 1024px)

**Fixed Left Sidebar (256px)**
- Logo at top
- All category groups visible with nested sub-pages
- Active page highlighted (accent background)
- Profile + Sign Out at bottom
- No hamburger (nav always visible)

**No Top Bar Navigation**
- Hamburger disappears
- Logo/branding moves to sidebar top

### Visual Style

- **Minimalist:** Subtle borders between categories, generous whitespace
- **Icons + Text:** All nav items show both icon and label (no icon-only items)
- **Active State:** Accent background color on current page
- **Typography:** Consistent sizing, clear hierarchy
- **Spacing:** 8px system, at least 16px padding between sections

---

## Landing Page (`/dashboard`)

### Hero Section
- Brief welcome message: "Welcome, [Role Name]" (e.g., "Welcome, Admin")
- Subtitle optional: e.g., "Here's what's happening today"

### Quick Action Cards

**Layout:**
- Mobile: 1 column, full-width cards
- Desktop: 2-3 column responsive grid
- Card size: consistent, ~200-300px wide on desktop

**Card Design (Minimalist):**
- Border + subtle background
- Icon (Lucide) at top-left
- Title + description
- Stat or action at bottom
- Hover: subtle elevation, color shift
- Spacing: 16px padding inside

**Admin Quick Actions:**
1. **Recent Registrations**
   - Icon: Users
   - Stat: "Last 5" or count
   - Action: Link to `/dashboard/registrations`
   - Shows mini-list of recent registrations

2. **Pending Payments**
   - Icon: CreditCard
   - Stat: Count + total amount
   - Action: Link to `/dashboard/payments`
   - Highlights unverified payments

3. **Create Schedule**
   - Icon: CalendarDays
   - Text: "Schedule a new game"
   - Action: Button to create modal or dedicated page
   - Link to `/dashboard/schedules`

**Facilitator Quick Actions:** TBD (defer to Phase 2)

**Player Quick Actions:** TBD (defer to Phase 2)

### Spacing & Typography
- Hero section: 40px top padding, 24px bottom
- Cards: 16px gap between cards
- Body text: readable contrast, dark mode optimized

---

## Individual Page Layouts

### Standard Page Structure

**Top Section (Sticky if scrollable)**
- **Title:** Page name (e.g., "Schedules", "Users")
- **Primary Action Button:** e.g., "Create", "Import", positioned right
- Optional: Secondary actions (dropdown menu)

**Filters & Search (Optional, Sticky)**
- Below title if page needs filtering/search
- Input + filter dropdowns
- Sticky on scroll (stays visible)

**Content Area**
- **For list pages (tables):**
  - Responsive table, horizontally scrollable on mobile if needed
  - Sortable columns, clear headers
  - Row actions (edit, delete) in rightmost column
  - Pagination or infinite scroll

- **For form pages (create/edit):**
  - Single column on mobile, 2 columns on desktop if form is long
  - Modals for quick actions
  - Full pages for complex forms

- **For card/grid views:**
  - Responsive grid (1 col mobile, 2+ cols desktop)
  - Consistent card styling

### Mobile Specifications
- Full-width content with 16px padding
- Tables: horizontal scroll if columns don't fit, minimum column width 80px
- Buttons: full-width or inline depending on space
- Forms: stacked inputs, full-width
- Modals: full-screen or large enough for touch targets (44×44px minimum)

### Desktop Specifications
- Content width: max ~1200px (or adjust to layout needs)
- Tables: multiple columns visible, better scannability
- Forms: 2-column layout if beneficial (e.g., separate sections)
- Side panels for detailed views instead of full modals
- Buttons: inline, sized appropriately

### Consistency Standards

**Spacing System:** 8px baseline
- Padding: 8px, 16px, 24px, 32px, 40px
- Gaps: 8px, 16px, 24px
- Margins: 0, 8px, 16px, 24px, 32px

**Typography:**
- Headings: consistent sizes, dark mode optimized
- Body text: readable line-height (1.5+), sufficient contrast (4.5:1)
- Labels: clear, associated with inputs

**Colors:**
- Use existing design tokens (dark mode first)
- Accent for active/interactive states
- Muted text for secondary info
- Error/warning/success colors for status

**Interactions:**
- Consistent button styles (default, outline, ghost, destructive)
- Hover states on all interactive elements
- Loading states for async operations
- Success/error toasts for feedback
- Smooth transitions (fadeUpVariants pattern for stagger animations)

---

## Role-Specific Navigation

### Admin
**Navigation Categories:**
- Management (Users, Locations, Schedules, Payment Channels)
- Registrations (Registrations)
- Payments (Payments)
- System (Error Logs)

**Landing Page:** Shows recent registrations, pending payments, create schedule cards

### Super Admin
**Navigation Categories:**
- Same as Admin + Error Logs visible by default

**Landing Page:** Same as Admin

### Facilitator
**Navigation Categories & Landing Page:** TBD (Phase 2)

### Player
**Navigation Categories & Landing Page:** TBD (Phase 2)

---

## Implementation Approach

### Phase 1: Core Navigation & Admin Dashboard
1. Redesign AppShell component (hamburger, top bar, sidebar)
2. Refactor NAV_ITEMS to use category structure
3. Create landing page component with quick-action cards
4. Update Admin category grouping (Management, Registrations, Payments, System)
5. Test mobile (< 1024px) and desktop (≥ 1024px) breakpoints

### Phase 2: Facilitator & Player Dashboards
1. Define Facilitator quick actions & categories
2. Define Player quick actions & categories
3. Update landing page to show role-specific cards

### Phase 3: Individual Page Redesigns
1. Audit all existing pages against standard structure
2. Redesign tables, forms, and grid views for minimalism
3. Ensure responsive behavior across breakpoints
4. Update animations to use fadeUpVariants pattern

---

## Success Criteria

- [ ] Mobile nav pattern (hamburger → full-screen modal) works smoothly
- [ ] Desktop sidebar expands without hamburger
- [ ] Breakpoint transition (1024px) is seamless
- [ ] Landing page cards are clear, actionable, role-specific
- [ ] All pages follow consistent spacing (8px system) and styling
- [ ] Navigation categories reduce user confusion about page purpose
- [ ] Mobile screen real estate maximized (no bottom nav)
- [ ] Minimalist aesthetic: clean, spacious, uncluttered
- [ ] Accessibility: keyboard nav, contrast, touch targets (44×44px mobile)
- [ ] Dark mode optimized throughout

---

## Deferred (Future Sprints)

- Facilitator landing page & quick actions
- Player landing page & quick actions
- Deep redesign of individual admin pages (schedules, users, payments, etc.)
- Advanced analytics dashboard
- Real-time notifications/alerts

