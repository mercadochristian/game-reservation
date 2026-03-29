# Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the public homepage with a minimalist aesthetic, featured games section, and conversion-focused structure.

**Architecture:** The homepage becomes a registration funnel: stripped-down hero → featured 2-3 upcoming games (new component) → full calendar → minimal footer (new). Featured games reduce friction by surfacing real upcoming games immediately. Hero loses stats row and focuses on convenience messaging. Footer adds social links.

**Tech Stack:** Next.js 15 (app router), React 19, TypeScript, Tailwind CSS v4, Framer Motion (existing animations), Zod (validation).

---

## File Structure

**New files:**
- `src/components/footer.tsx` — Minimal footer with copyright and social media links (FB, IG)
- `src/components/featured-games-section.tsx` — Displays 2-3 upcoming games with server-side data fetching
- `src/components/featured-game-card.tsx` — Reusable card component for individual game display
- `__tests__/components/footer.test.tsx` — Unit tests for footer
- `__tests__/components/featured-games-section.test.tsx` — Unit tests for featured games section
- `__tests__/components/featured-game-card.test.tsx` — Unit tests for game card

**Modified files:**
- `src/components/hero-section.tsx` — Remove stats row, update copy, simplify design
- `src/components/public-calendar.tsx` — Update styling for minimalist aesthetic (spacing, borders, typography)
- `src/app/page.tsx` — Wire in featured games section and footer

---

## Task 1: Create Footer Component

**Files:**
- Create: `src/components/footer.tsx`
- Test: `__tests__/components/footer.test.tsx`

**Objective:** Build a minimal footer with copyright and social media links (Facebook & Instagram).

- [ ] **Step 1: Write test for footer rendering**

Create `__tests__/components/footer.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { Footer } from '@/components/footer'

describe('Footer', () => {
  it('should render copyright text', () => {
    render(<Footer />)
    expect(screen.getByText(/© 2026/)).toBeInTheDocument()
  })

  it('should render Facebook social link', () => {
    render(<Footer />)
    const fbLink = screen.getByRole('link', { name: /facebook/i })
    expect(fbLink).toHaveAttribute('href', expect.stringContaining('facebook.com'))
  })

  it('should render Instagram social link', () => {
    render(<Footer />)
    const igLink = screen.getByRole('link', { name: /instagram/i })
    expect(igLink).toHaveAttribute('href', expect.stringContaining('instagram.com'))
  })

  it('should have correct aria-labels for accessibility', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: /facebook/i })).toHaveAttribute('aria-label')
    expect(screen.getByRole('link', { name: /instagram/i })).toHaveAttribute('aria-label')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/components/footer.test.tsx
```

Expected: FAIL — "Cannot find module '@/components/footer'"

- [ ] **Step 3: Create Footer component**

Create `src/components/footer.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { Facebook, Instagram } from 'lucide-react'
import { branding } from '@/lib/config/branding'

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            © 2026 {branding.name}. All rights reserved.
          </p>

          {/* Social Links */}
          <div className="flex gap-4">
            <Link
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit our Facebook page"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Facebook className="h-5 w-5" />
            </Link>
            <Link
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit our Instagram page"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Instagram className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/components/footer.test.tsx
```

Expected: PASS (all 4 tests passing)

- [ ] **Step 5: Commit**

```bash
git add src/components/footer.tsx __tests__/components/footer.test.tsx
git commit -m "feat(footer): add minimal footer with social media links"
```

---

## Task 2: Create Featured Game Card Component

**Files:**
- Create: `src/components/featured-game-card.tsx`
- Test: `__tests__/components/featured-game-card.test.tsx`

**Objective:** Build a reusable card component for displaying individual upcoming games.

- [ ] **Step 1: Write test for card rendering**

Create `__tests__/components/featured-game-card.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { FeaturedGameCard } from '@/components/featured-game-card'
import type { ScheduleWithLocation } from '@/types'

const mockGame: ScheduleWithLocation = {
  id: '1',
  location_id: 'loc1',
  start_time: '2026-03-31T19:00:00Z',
  end_time: '2026-03-31T21:00:00Z',
  max_players: 12,
  status: 'open',
  created_at: '2026-03-01',
  updated_at: '2026-03-01',
  locations: {
    id: 'loc1',
    name: 'Makati Sports Complex',
    address: 'Makati City',
    google_map_url: 'https://maps.google.com',
  },
}

describe('FeaturedGameCard', () => {
  it('should render date and time', () => {
    // Mock 4 registrations out of 12 max = 8 spots left
    const gameWithRegistrations = {
      ...mockGame,
      registrations_count: 4,
    }
    render(<FeaturedGameCard schedule={gameWithRegistrations} />)
    expect(screen.getByText(/Mar/)).toBeInTheDocument()
    expect(screen.getByText(/7:00 PM/)).toBeInTheDocument()
  })

  it('should render location name and address', () => {
    const gameWithRegistrations = { ...mockGame, registrations_count: 4 }
    render(<FeaturedGameCard schedule={gameWithRegistrations} />)
    expect(screen.getByText('Makati Sports Complex')).toBeInTheDocument()
    expect(screen.getByText('Makati City')).toBeInTheDocument()
  })

  it('should display spots remaining', () => {
    const gameWithRegistrations = { ...mockGame, registrations_count: 4 }
    render(<FeaturedGameCard schedule={gameWithRegistrations} />)
    expect(screen.getByText('8 spots left')).toBeInTheDocument()
  })

  it('should highlight low spots in warning color', () => {
    const gameWithRegistrations = { ...mockGame, registrations_count: 11 } // 1 spot left
    const { container } = render(<FeaturedGameCard schedule={gameWithRegistrations} />)
    const spotsElement = screen.getByText('1 spot left')
    expect(spotsElement.parentElement).toHaveClass('text-red-500')
  })

  it('should render Register link with correct href', () => {
    const gameWithRegistrations = { ...mockGame, registrations_count: 4 }
    render(<FeaturedGameCard schedule={gameWithRegistrations} />)
    const registerLink = screen.getByRole('link', { name: /register/i })
    expect(registerLink).toHaveAttribute('href', '/register?schedule_id=1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/components/featured-game-card.test.tsx
```

Expected: FAIL — "Cannot find module '@/components/featured-game-card'"

- [ ] **Step 3: Create FeaturedGameCard component**

Create `src/components/featured-game-card.tsx`:

```typescript
'use client'

import Link from 'next/link'
import type { ScheduleWithLocation } from '@/types'
import { formatDateTime } from '@/lib/utils/date'

interface FeaturedGameCardProps {
  schedule: ScheduleWithLocation & { registrations_count: number }
}

export function FeaturedGameCard({ schedule }: FeaturedGameCardProps) {
  const spotsRemaining = schedule.max_players - schedule.registrations_count
  const isLowSpots = spotsRemaining <= 2
  const spotText = spotsRemaining === 1 ? '1 spot left' : `${spotsRemaining} spots left`

  return (
    <div className="border border-border rounded-lg bg-white p-6 hover:bg-gray-50 transition-colors">
      {/* Date & Time */}
      <h3 className="text-lg font-bold text-foreground mb-4">
        {formatDateTime(schedule.start_time, 'EEE, MMM d • h:mm a')}
      </h3>

      {/* Location */}
      <div className="mb-6">
        <p className="font-medium text-foreground">{schedule.locations?.name}</p>
        <p className="text-sm text-muted-foreground">{schedule.locations?.address}</p>
      </div>

      {/* Spots & Register */}
      <div className="flex items-end justify-between">
        <p className={`text-sm font-medium ${isLowSpots ? 'text-red-500' : 'text-muted-foreground'}`}>
          {spotText}
        </p>
        <Link
          href={`/register?schedule_id=${schedule.id}`}
          className="inline-flex items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap transition-all h-8 px-3 hover:opacity-90"
        >
          Register →
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/components/featured-game-card.test.tsx
```

Expected: PASS (all 5 tests passing)

- [ ] **Step 5: Commit**

```bash
git add src/components/featured-game-card.tsx __tests__/components/featured-game-card.test.tsx
git commit -m "feat(featured-games): add game card component with spots indicator"
```

---

## Task 3: Create Featured Games Section Component

**Files:**
- Create: `src/components/featured-games-section.tsx`
- Test: `__tests__/components/featured-games-section.test.tsx`

**Objective:** Build section that fetches and displays 2-3 upcoming available games (server-side).

- [ ] **Step 1: Write test for featured games section**

Create `__tests__/components/featured-games-section.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { FeaturedGamesSection } from '@/components/featured-games-section'
import type { ScheduleWithLocation } from '@/types'

const mockGames: (ScheduleWithLocation & { registrations_count: number })[] = [
  {
    id: '1',
    location_id: 'loc1',
    start_time: '2026-03-31T19:00:00Z',
    end_time: '2026-03-31T21:00:00Z',
    max_players: 12,
    status: 'open',
    created_at: '2026-03-01',
    updated_at: '2026-03-01',
    registrations_count: 4,
    locations: {
      id: 'loc1',
      name: 'Makati Sports Complex',
      address: 'Makati City',
      google_map_url: 'https://maps.google.com',
    },
  },
]

describe('FeaturedGamesSection', () => {
  it('should render section heading', () => {
    render(<FeaturedGamesSection schedules={mockGames} />)
    expect(screen.getByText(/featured games/i)).toBeInTheDocument()
  })

  it('should render featured games as a grid', () => {
    render(<FeaturedGamesSection schedules={mockGames} />)
    expect(screen.getByText('Makati Sports Complex')).toBeInTheDocument()
  })

  it('should show placeholder when no games available', () => {
    render(<FeaturedGamesSection schedules={[]} />)
    expect(screen.getByText(/no upcoming games/i)).toBeInTheDocument()
  })

  it('should display maximum 3 games', () => {
    const manyGames = Array.from({ length: 5 }, (_, i) => ({
      ...mockGames[0],
      id: String(i),
    }))
    const { container } = render(<FeaturedGamesSection schedules={manyGames} />)
    const cards = container.querySelectorAll('[data-testid="game-card"]')
    expect(cards).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/components/featured-games-section.test.tsx
```

Expected: FAIL — "Cannot find module '@/components/featured-games-section'"

- [ ] **Step 3: Create FeaturedGamesSection component**

Create `src/components/featured-games-section.tsx`:

```typescript
'use client'

import { motion } from 'framer-motion'
import type { ScheduleWithLocation } from '@/types'
import { FeaturedGameCard } from '@/components/featured-game-card'
import { fadeUpVariants } from '@/lib/animations'

interface FeaturedGamesSectionProps {
  schedules: (ScheduleWithLocation & { registrations_count: number })[]
}

export function FeaturedGamesSection({ schedules }: FeaturedGamesSectionProps) {
  // Show only first 3 upcoming games
  const featuredGames = schedules.slice(0, 3)

  return (
    <section id="schedule" className="py-16 px-4 sm:px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Section heading */}
        <motion.div
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUpVariants}
          className="mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Featured Games
          </h2>
        </motion.div>

        {/* Games grid or empty state */}
        {featuredGames.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {featuredGames.map((game, index) => (
              <motion.div
                key={game.id}
                custom={index}
                variants={fadeUpVariants}
                data-testid="game-card"
              >
                <FeaturedGameCard schedule={game} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            className="text-center py-12"
          >
            <p className="text-muted-foreground">
              No upcoming games at the moment. Check back soon!
            </p>
          </motion.div>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/components/featured-games-section.test.tsx
```

Expected: PASS (all 4 tests passing)

- [ ] **Step 5: Commit**

```bash
git add src/components/featured-games-section.tsx __tests__/components/featured-games-section.test.tsx
git commit -m "feat(featured-games): add featured games section with 3-game limit"
```

---

## Task 4: Simplify Hero Section

**Files:**
- Modify: `src/components/hero-section.tsx`

**Objective:** Remove stats row, update messaging to focus on convenience, simplify design.

- [ ] **Step 1: Update hero-section.tsx**

Modify `src/components/hero-section.tsx` — replace entire component:

```typescript
'use client'

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { branding } from '@/lib/config/branding'
import { fadeUpVariants } from '@/lib/animations'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 px-4 sm:px-6">
      {/* Atmosphere layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        {/* Radial glow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 60% at 50% 0%, oklch(0.62 0.19 255 / 0.15), transparent 70%)',
          }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle, oklch(0.97 0.008 250 / 0.12) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
        {/* Logo + Name */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="flex items-center gap-4 sm:gap-6 justify-center"
        >
          {branding.logo.url && (
            <img
              src={branding.logo.url}
              alt={branding.logo.altText}
              width={branding.logo.width || 48}
              height={branding.logo.height || 48}
              className="h-12 w-auto"
            />
          )}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
            {branding.name}
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="text-xl sm:text-2xl font-medium"
          style={{ color: 'var(--primary)' }}
        >
          Reserve Your Spot
        </motion.p>

        {/* Description */}
        <motion.p
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto"
        >
          Find games near you. Register in seconds. Play today.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="pt-4"
        >
          <a
            href="#schedule"
            className="inline-flex items-center justify-center gap-2 h-10 px-6
                       rounded-lg bg-primary text-primary-foreground text-sm font-medium
                       transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Browse Games
            <ChevronDown className="h-4 w-4" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
```

Key changes:
- Removed `gamesThisMonth`, `uniqueLocations`, `upcomingCount` props
- Removed stats row rendering entirely
- Updated tagline to "Reserve Your Spot"
- Updated description to "Find games near you. Register in seconds. Play today."
- Updated CTA button text from "View Schedule" to "Browse Games"
- Simplified animation stagger (custom 0-3 instead of 0-4)

- [ ] **Step 2: Verify type signatures are correct**

Check that components importing HeroSection don't pass the removed props. Search for usage:

```bash
grep -r "HeroSection" src/ --include="*.tsx" --include="*.ts"
```

Expected: Should find only `src/app/page.tsx` which will be updated in Task 6.

- [ ] **Step 3: Commit**

```bash
git add src/components/hero-section.tsx
git commit -m "feat(hero): simplify section, remove stats, update messaging for convenience"
```

---

## Task 5: Update Public Calendar Styling

**Files:**
- Modify: `src/components/public-calendar.tsx`

**Objective:** Update styling to match minimalist aesthetic (spacing, borders, typography).

- [ ] **Step 1: Read current public-calendar.tsx**

```bash
head -100 src/components/public-calendar.tsx
```

Understand current structure, then update styling.

- [ ] **Step 2: Update public-calendar.tsx for minimalist design**

Modify `src/components/public-calendar.tsx` — Update the root section and any schedule item styling:

Find this line (or similar):
```tsx
<section className="pt-8 px-4 max-w-4xl mx-auto">
```

Replace with:
```tsx
<section className="py-16 px-4 sm:px-6 bg-background">
  <div className="max-w-7xl mx-auto">
    <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-12">All Games</h2>
```

And ensure all schedule cards/items have:
- `border border-border` (1px light gray border)
- `rounded-lg` (8px border radius)
- `p-6` or `p-4` (padding)
- `hover:bg-gray-50` (subtle hover effect)
- No drop shadows
- Remove any background colors in favor of white/transparent

- [ ] **Step 3: Commit**

```bash
git add src/components/public-calendar.tsx
git commit -m "style(calendar): apply minimalist aesthetic with borders and spacing"
```

---

## Task 6: Wire Components into Homepage

**Files:**
- Modify: `src/app/page.tsx`

**Objective:** Add featured games section and footer to homepage; adjust data fetching.

- [ ] **Step 1: Update page.tsx to include featured games and footer**

Modify `src/app/page.tsx`:

```typescript
import { Suspense } from 'react'
import type { ScheduleWithLocation } from '@/types'
import { createServiceClient } from '@/lib/supabase/service'
import { getNowInManila } from '@/lib/utils/timezone'
import { PublicNav } from '@/components/public-nav'
import { PublicCalendar } from '@/components/public-calendar'
import { HeroSection } from '@/components/hero-section'
import { FeaturedGamesSection } from '@/components/featured-games-section'
import { Footer } from '@/components/footer'

async function getSchedules(): Promise<(ScheduleWithLocation & { registrations_count: number })[]> {
  const supabase = createServiceClient()

  const { data: schedules } = await supabase
    .from('schedules')
    .select(`
      *,
      locations(id, name, address, google_map_url),
      registrations(id)
    `)
    .in('status', ['open', 'full', 'completed'])
    .order('start_time', { ascending: true })

  if (!schedules) return []

  // Map schedules with registration counts
  return (schedules as any[]).map((schedule) => ({
    ...schedule,
    registrations_count: schedule.registrations?.length ?? 0,
  }))
}

function CalendarLoading() {
  return (
    <div className="pt-8 px-4 max-w-4xl mx-auto">
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default async function Home() {
  const schedules = await getSchedules()

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <HeroSection />
      <div className="h-px max-w-4xl mx-auto px-4 sm:px-6">
        <div className="h-px bg-linear-to-r from-transparent via-border to-transparent" />
      </div>
      <FeaturedGamesSection schedules={schedules} />
      <div className="h-px max-w-4xl mx-auto px-4 sm:px-6">
        <div className="h-px bg-linear-to-r from-transparent via-border to-transparent" />
      </div>
      <Suspense fallback={<CalendarLoading />}>
        <PublicCalendar schedules={schedules} />
      </Suspense>
      <Footer />
    </div>
  )
}
```

Key changes:
- Updated `getSchedules()` to fetch `registrations` count per schedule
- Added `registrations_count` to returned schedule objects
- Updated HeroSection call (removed props)
- Added FeaturedGamesSection above PublicCalendar
- Added Footer at bottom
- Added divider lines between major sections (subtle separator)

- [ ] **Step 2: Verify data structure**

Confirm the `registrations` table exists in Supabase:

```bash
# Check recent schema/migrations
git log --oneline supabase/migrations/ | head -10
```

If registrations table doesn't exist, you'll need to create it. Assume it has `schedule_id` and `user_id` fields (standard relationship).

- [ ] **Step 3: Test page in dev**

Start dev server:

```bash
npm run dev
```

Visit `http://localhost:3000` and verify:
- Hero section appears simplified (no stats)
- Featured games section shows upcoming games (or "no games" placeholder)
- Calendar renders below
- Footer appears at bottom with social links

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(homepage): integrate featured games section and footer"
```

---

## Task 7: Test Responsive Behavior

**Files:**
- Test: Manual testing on mobile/tablet/desktop

**Objective:** Verify homepage is responsive across all breakpoints (mobile <640px, tablet 640-1024px, desktop ≥1024px).

- [ ] **Step 1: Test on mobile (<640px)**

In browser dev tools, set viewport to 375px width (iPhone SE size):
- Hero: centered, readable
- Featured cards: single column, full width with padding
- Calendar: single column, readable
- Footer: centered, stacked social icons

- [ ] **Step 2: Test on tablet (640-1024px)**

Set viewport to 768px width (iPad size):
- Featured cards: 2-column grid
- Calendar: appropriate spacing
- Overall layout balanced

- [ ] **Step 3: Test on desktop (≥1024px)**

Set viewport to 1440px width:
- Featured cards: 3-column grid
- Calendar: full layout
- Max-width container (1200px) respected

- [ ] **Step 4: Test accessibility**

Use browser tools:
- Keyboard navigation: Tab through all links/buttons (nav, CTA, register buttons, footer links)
- Focus indicators: All interactive elements show visible focus ring
- Color contrast: Use WAVE or axe DevTools to check WCAG AA compliance

- [ ] **Step 5: Commit responsive testing notes**

```bash
git add -A
git commit -m "test(homepage): verify responsive behavior and accessibility across breakpoints"
```

---

## Task 8: Final Polish & Performance Check

**Files:**
- Test: Performance and visual polish

**Objective:** Ensure animations are smooth, images load properly, no console errors.

- [ ] **Step 1: Check console for errors**

Open dev tools → Console tab:
```bash
npm run dev
# Visit http://localhost:3000, check console for errors
```

Expected: No errors or warnings (warnings are acceptable if from dependencies).

- [ ] **Step 2: Test animations**

Visit homepage and verify:
- Hero elements fade in smoothly (staggered)
- Featured games cards animate in (staggered, subtle)
- No janky or laggy animations
- Hover states on cards are smooth (background shift)

- [ ] **Step 3: Run build to check for type errors**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Run linter**

```bash
npm run lint
```

Expected: No errors (fix any warnings if found).

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore(homepage): polish animations, verify build and linting pass"
```

---

## Spec Coverage Checklist

- [x] **Hero Section (simplified)** → Task 4
- [x] **Featured Games Section (NEW)** → Tasks 2, 3
- [x] **Footer with social links (NEW)** → Task 1
- [x] **Minimalist styling** → Tasks 2, 3, 4, 5
- [x] **Responsive layout** → Task 7
- [x] **Accessibility** → Task 7, inherent in components
- [x] **Page integration** → Task 6
- [x] **Testing** → Tasks 1, 2, 3, 7, 8

All spec requirements covered by tasks. No gaps.

