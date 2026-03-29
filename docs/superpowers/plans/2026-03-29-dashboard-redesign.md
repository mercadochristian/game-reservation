# Dashboard Redesign Implementation Plan — Phase 1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 1 dashboard redesign: hamburger/sidebar navigation, category-based nav structure, and Admin landing page with quick-action cards.

**Architecture:**
- Refactor AppShell to toggle between mobile (hamburger + top bar) and desktop (sidebar) at 1024px breakpoint
- Define navigation as categories → sub-pages (not flat list)
- Create reusable quick-action card component
- Replace profile page with dashboard landing page showing role-specific cards

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind v4, Framer Motion, Lucide Icons

---

## File Structure

### Files to Create
- `src/lib/config/navigation.ts` — Navigation category structure (types + config)
- `src/components/dashboard/quick-action-card.tsx` — Reusable quick-action card
- `src/components/dashboard/dashboard-client.tsx` — Admin landing page component
- `src/components/navigation/nav-modal.tsx` — Mobile full-screen navigation modal
- `src/app/dashboard/dashboard-client.tsx` — Page client wrapper (existing page now delegates here)
- `src/lib/dashboard/queries.ts` — Dashboard data fetching (registrations, payments counts)

### Files to Modify
- `src/components/app-shell.tsx` — Refactor: hamburger/sidebar toggle, category nav structure
- `src/app/dashboard/page.tsx` — Replace profile with dashboard landing page
- `src/app/dashboard/layout.tsx` — No changes needed (AppShell handles nav)

---

## Task Breakdown

### Task 1: Define Navigation Category Structure

**Files:**
- Create: `src/lib/config/navigation.ts`

Navigation must move from a flat list to a categorized hierarchy. This task defines the types and config.

- [ ] **Step 1: Write types for navigation structure**

Create `src/lib/config/navigation.ts`:

```typescript
import type { LucideIcon } from 'lucide-react'

export type Role = 'admin' | 'facilitator' | 'player' | 'super_admin'

export interface NavPage {
  label: string
  href: string
  icon: LucideIcon
  roles: Role[]
  isComingSoon?: boolean
}

export interface NavCategory {
  id: string
  label: string
  pages: NavPage[]
}

export interface NavigationConfig {
  categories: NavCategory[]
  profilePage: NavPage
  signOutAction: { label: string; roles: Role[] }
}
```

- [ ] **Step 2: Define Admin navigation categories**

Add to `src/lib/config/navigation.ts`, after types:

```typescript
import { Users, MapPin, CalendarDays, CreditCard, AlertTriangle, QrCode, Landmark, UserCircle, LogOut } from 'lucide-react'

export const NAVIGATION_CONFIG: NavigationConfig = {
  categories: [
    {
      id: 'management',
      label: 'Management',
      pages: [
        { label: 'Users', href: '/dashboard/users', icon: Users, roles: ['admin', 'super_admin'] },
        { label: 'Locations', href: '/dashboard/locations', icon: MapPin, roles: ['admin', 'super_admin'] },
        { label: 'Schedules', href: '/dashboard/schedules', icon: CalendarDays, roles: ['admin', 'super_admin'] },
        { label: 'Payment Channels', href: '/dashboard/payment-channels', icon: Landmark, roles: ['admin', 'super_admin'] },
      ],
    },
    {
      id: 'registrations',
      label: 'Registrations',
      pages: [
        { label: 'Registrations', href: '/dashboard/registrations', icon: Users, roles: ['admin', 'super_admin'] },
      ],
    },
    {
      id: 'payments',
      label: 'Payments',
      pages: [
        { label: 'Payments', href: '/dashboard/payments', icon: CreditCard, roles: ['admin', 'super_admin'] },
      ],
    },
    {
      id: 'system',
      label: 'System',
      pages: [
        { label: 'Error Logs', href: '/dashboard/logs', icon: AlertTriangle, roles: ['super_admin'] },
      ],
    },
    {
      id: 'facilitator',
      label: 'Facilitator',
      pages: [
        { label: 'QR Scanner', href: '/dashboard/scanner', icon: QrCode, roles: ['facilitator'], isComingSoon: true },
        { label: 'Team Management', href: '/dashboard/teams', icon: Users, roles: ['facilitator'], isComingSoon: true },
        { label: 'Award MVP', href: '/dashboard/mvp', icon: Users, roles: ['facilitator'], isComingSoon: true },
      ],
    },
    {
      id: 'player',
      label: 'Player',
      pages: [
        { label: 'Register', href: '/dashboard/register', icon: CalendarDays, roles: ['player'], isComingSoon: true },
        { label: 'My Registrations', href: '/dashboard/my-registrations', icon: CalendarDays, roles: ['player'], isComingSoon: true },
      ],
    },
  ],
  profilePage: { label: 'Profile', href: '/dashboard', icon: UserCircle, roles: ['admin', 'super_admin', 'facilitator', 'player'] },
  signOutAction: { label: 'Sign Out', roles: ['admin', 'super_admin', 'facilitator', 'player'] },
}

// Helper: get nav categories filtered by role
export function getNavByRole(role: Role | null): NavCategory[] {
  if (!role) return []
  return NAVIGATION_CONFIG.categories.map(cat => ({
    ...cat,
    pages: cat.pages.filter(page => page.roles.includes(role)),
  })).filter(cat => cat.pages.length > 0)
}
```

- [ ] **Step 3: Export types from lib/config/navigation.ts**

Add export at end of file:

```typescript
export type { NavigationConfig, NavCategory, NavPage, Role }
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/config/navigation.ts
git commit -m "feat: define navigation category structure and config"
```

---

### Task 2: Create Quick-Action Card Component

**Files:**
- Create: `src/components/dashboard/quick-action-card.tsx`
- Test: `src/components/dashboard/quick-action-card.test.tsx`

- [ ] **Step 1: Write test for quick-action card**

Create `src/components/dashboard/quick-action-card.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { Users } from 'lucide-react'
import { QuickActionCard } from './quick-action-card'

describe('QuickActionCard', () => {
  it('should render title and description', () => {
    render(
      <QuickActionCard
        icon={Users}
        title="Recent Registrations"
        description="View your latest registrations"
        stat="5 new"
        href="/dashboard/registrations"
      />
    )
    expect(screen.getByText('Recent Registrations')).toBeInTheDocument()
    expect(screen.getByText('View your latest registrations')).toBeInTheDocument()
  })

  it('should render stat text', () => {
    render(
      <QuickActionCard
        icon={Users}
        title="Test"
        description="Test card"
        stat="12 items"
        href="/dashboard/test"
      />
    )
    expect(screen.getByText('12 items')).toBeInTheDocument()
  })

  it('should render as a link to href', () => {
    render(
      <QuickActionCard
        icon={Users}
        title="Test"
        description="Test"
        stat="1"
        href="/dashboard/test"
      />
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/dashboard/test')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/components/dashboard/quick-action-card.test.tsx
```

Expected: FAIL (file doesn't exist)

- [ ] **Step 3: Write quick-action card component**

Create `src/components/dashboard/quick-action-card.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { type LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface QuickActionCardProps {
  icon: LucideIcon
  title: string
  description: string
  stat: string
  href: string
  custom?: number
}

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: custom * 0.1 },
  }),
}

export function QuickActionCard({
  icon: Icon,
  title,
  description,
  stat,
  href,
  custom = 0,
}: QuickActionCardProps) {
  return (
    <motion.div
      custom={custom}
      initial="hidden"
      animate="visible"
      variants={fadeUpVariants}
    >
      <Link
        href={href}
        className="flex flex-col p-4 border border-border rounded-lg bg-card hover:bg-card/80 transition-colors cursor-pointer h-full"
      >
        <div className="flex items-start justify-between mb-3">
          <Icon size={24} className="text-accent" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-auto">{description}</p>
        <div className="text-lg font-bold text-accent mt-4">{stat}</div>
      </Link>
    </motion.div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/components/dashboard/quick-action-card.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/quick-action-card.tsx src/components/dashboard/quick-action-card.test.tsx
git commit -m "feat: add quick-action card component with animations"
```

---

### Task 3: Create Mobile Navigation Modal

**Files:**
- Create: `src/components/navigation/nav-modal.tsx`

- [ ] **Step 1: Write nav-modal component for mobile**

Create `src/components/navigation/nav-modal.tsx`:

```typescript
'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { NavCategory, NavPage } from '@/lib/config/navigation'

interface NavModalProps {
  isOpen: boolean
  onClose: () => void
  categories: NavCategory[]
  profilePage: NavPage
  signOutLabel: string
  pathname: string
  onNavigate: (href: string) => void
  onSignOut: () => void
}

export function NavModal({
  isOpen,
  onClose,
  categories,
  profilePage,
  signOutLabel,
  pathname,
  onNavigate,
  onSignOut,
}: NavModalProps) {
  const handleNavClick = useCallback(
    (href: string) => {
      onNavigate(href)
      onClose()
    },
    [onNavigate, onClose]
  )

  const handleSignOut = useCallback(
    () => {
      onSignOut()
      onClose()
    },
    [onSignOut, onClose]
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />

          {/* Modal */}
          <motion.div
            initial={{ x: -256 }}
            animate={{ x: 0 }}
            exit={{ x: -256 }}
            transition={{ duration: 0.2 }}
            className="fixed left-0 top-0 bottom-0 w-64 bg-background border-r border-border z-50 overflow-y-auto flex flex-col lg:hidden"
          >
            {/* Header with close button */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Menu</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-muted rounded-md transition-colors"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Categories and pages */}
            <div className="flex-1 overflow-y-auto p-4">
              {categories.map(category => {
                const Icon = profilePage.icon
                return (
                  <div key={category.id} className="mb-6">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {category.label}
                    </h3>
                    <div className="space-y-1">
                      {category.pages.map(page => {
                        const PageIcon = page.icon
                        const isActive = pathname === page.href
                        const isComingSoon = page.isComingSoon
                        return (
                          <div key={page.href}>
                            {isComingSoon ? (
                              <div
                                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm opacity-50 cursor-not-allowed"
                                title="Coming soon"
                              >
                                <PageIcon size={16} />
                                <span>{page.label}</span>
                              </div>
                            ) : (
                              <Link
                                href={page.href}
                                onClick={() => handleNavClick(page.href)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                                  isActive
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-foreground hover:bg-muted'
                                }`}
                              >
                                <PageIcon size={16} />
                                <span>{page.label}</span>
                              </Link>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer: Profile and Sign Out */}
            <div className="border-t border-border p-4 space-y-2">
              <Link
                href={profilePage.href}
                onClick={() => handleNavClick(profilePage.href)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  pathname === profilePage.href
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <profilePage.icon size={16} />
                <span>{profilePage.label}</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-foreground hover:bg-muted transition-colors text-left"
              >
                <X size={16} />
                <span>{signOutLabel}</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/navigation/nav-modal.tsx
git commit -m "feat: add mobile navigation modal with category structure"
```

---

### Task 4: Refactor AppShell for Hamburger/Sidebar Toggle

**Files:**
- Modify: `src/components/app-shell.tsx`

This is the core navigation refactor. Mobile gets hamburger + modal, desktop gets sidebar.

- [ ] **Step 1: Read current AppShell**

```bash
cat src/components/app-shell.tsx | head -100
```

- [ ] **Step 2: Replace entire AppShell with new implementation**

Replace `src/components/app-shell.tsx`:

```typescript
'use client'

import { useCallback, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, UserCircle, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'
import { branding } from '@/lib/config/branding'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user-context'
import { SKILL_LEVEL_LABELS } from '@/lib/constants/labels'
import { NAVIGATION_CONFIG, getNavByRole, type Role } from '@/lib/config/navigation'
import { NavModal } from '@/components/navigation/nav-modal'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { user } = useUser()
  const [navModalOpen, setNavModalOpen] = useState(false)

  const role = (user?.role ?? null) as Role | null

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }, [supabase, router])

  const displayName = useMemo(
    () => user
      ? [user.first_name, user.last_name].filter(Boolean).join(' ') || null
      : null,
    [user]
  )

  const displaySubtitle = useMemo(() => {
    if (!user) return null
    const ROLE_LABELS: Record<Role, string> = {
      admin: 'Admin',
      super_admin: 'Super Admin',
      facilitator: 'Facilitator',
      player: 'Player',
    }
    if (role === 'player' && user.skill_level) {
      return SKILL_LEVEL_LABELS[user.skill_level] ?? null
    }
    return ROLE_LABELS[role!] ?? null
  }, [user, role])

  const navCategories = useMemo(() => getNavByRole(role), [role])

  if (!role) return null

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Mobile: Fixed Top Bar (< 1024px) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center px-4 z-40 gap-4">
        <button
          onClick={() => setNavModalOpen(true)}
          className="p-1 hover:bg-muted rounded-md transition-colors"
          aria-label="Open navigation"
        >
          <Menu size={24} />
        </button>
        <div className="flex-1 flex items-center justify-center gap-2">
          {branding.logo && (
            <Image
              src={branding.logo.url}
              alt={branding.logo.altText}
              width={32}
              height={40}
              className="shrink-0"
            />
          )}
          <div className="text-center text-xs">
            <div className="font-semibold text-foreground">{branding.name}</div>
            <div className="text-muted-foreground text-xs">{branding.tagline}</div>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="p-1 hover:bg-muted rounded-md transition-colors"
          aria-label="View profile"
        >
          <UserCircle size={24} />
        </Link>
      </div>

      {/* Mobile Navigation Modal */}
      <NavModal
        isOpen={navModalOpen}
        onClose={() => setNavModalOpen(false)}
        categories={navCategories}
        profilePage={NAVIGATION_CONFIG.profilePage}
        signOutLabel={NAVIGATION_CONFIG.signOutAction.label}
        pathname={pathname}
        onNavigate={() => {}} // NavModal handles navigation via Link
        onSignOut={handleSignOut}
      />

      {/* Desktop: Fixed Left Sidebar (≥ 1024px) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:bottom-0 bg-card border-r border-border z-30">
        {/* Sidebar Logo */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          {branding.logo && (
            <Image
              src={branding.logo.url}
              alt={branding.logo.altText}
              width={32}
              height={40}
              className="shrink-0"
            />
          )}
          <div>
            <div className="font-semibold text-sm text-foreground">{branding.name}</div>
            <div className="text-xs text-muted-foreground">{branding.tagline}</div>
          </div>
        </div>

        {/* Sidebar Categories & Pages */}
        <nav className="flex-1 overflow-y-auto p-4">
          {navCategories.map(category => (
            <div key={category.id} className="mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {category.label}
              </h3>
              <div className="space-y-1">
                {category.pages.map(page => {
                  const Icon = page.icon
                  const isActive = pathname === page.href
                  const isComingSoon = page.isComingSoon
                  return (
                    <div key={page.href}>
                      {isComingSoon ? (
                        <div
                          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm opacity-50 cursor-not-allowed"
                          title="Coming soon"
                        >
                          <Icon size={18} />
                          <span>{page.label}</span>
                        </div>
                      ) : (
                        <Link
                          href={page.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <Icon size={18} />
                          <span>{page.label}</span>
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer: Profile & Sign Out */}
        <div className="border-t border-border p-4 space-y-2">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              pathname === '/dashboard'
                ? 'bg-accent text-accent-foreground'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <UserCircle size={18} />
            <span>Profile</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-muted transition-colors text-left"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full pt-16 lg:pt-0 lg:ml-64">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Run dev server to test breakpoint transition**

```bash
npm run dev
```

Navigate to http://localhost:3000/dashboard. Test:
- **Mobile (< 1024px):** Hamburger menu opens full-screen modal
- **Desktop (≥ 1024px):** Sidebar visible, hamburger hidden
- **Resize between breakpoints:** Layout transitions smoothly

- [ ] **Step 4: Commit**

```bash
git add src/components/app-shell.tsx
git commit -m "refactor: implement hamburger/sidebar navigation with category structure"
```

---

### Task 5: Create Dashboard Landing Page Component

**Files:**
- Create: `src/components/dashboard/dashboard-client.tsx`
- Test: `src/components/dashboard/dashboard-client.test.tsx`

- [ ] **Step 1: Create dashboard client component**

Create `src/components/dashboard/dashboard-client.tsx`:

```typescript
'use client'

import { motion } from 'framer-motion'
import { Users, CreditCard, CalendarDays } from 'lucide-react'
import { QuickActionCard } from './quick-action-card'
import { useUser } from '@/lib/context/user-context'

interface DashboardClientProps {
  recentRegistrationsCount: number
  pendingPaymentsCount: number
  pendingPaymentsTotal: number
}

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: custom * 0.1 },
  }),
}

export function DashboardClient({
  recentRegistrationsCount,
  pendingPaymentsCount,
  pendingPaymentsTotal,
}: DashboardClientProps) {
  const { user } = useUser()

  const ROLE_LABELS: Record<string, string> = {
    admin: 'Admin',
    super_admin: 'Super Admin',
    facilitator: 'Facilitator',
    player: 'Player',
  }

  const roleLabel = user?.role ? ROLE_LABELS[user.role] : 'User'

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      {/* Hero Section */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeUpVariants}
        className="mb-12"
      >
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Welcome, {roleLabel}
        </h1>
        <p className="text-lg text-muted-foreground">
          Here's what's happening today
        </p>
      </motion.section>

      {/* Quick Action Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <QuickActionCard
          custom={0}
          icon={Users}
          title="Recent Registrations"
          description="View your latest registrations"
          stat={`${recentRegistrationsCount} new`}
          href="/dashboard/registrations"
        />

        <QuickActionCard
          custom={1}
          icon={CreditCard}
          title="Pending Payments"
          description="Payments awaiting verification"
          stat={`${pendingPaymentsCount} items`}
          href="/dashboard/payments"
        />

        <QuickActionCard
          custom={2}
          icon={CalendarDays}
          title="Create Schedule"
          description="Schedule a new game"
          stat="Quick action"
          href="/dashboard/schedules"
        />
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Write test for dashboard client**

Create `src/components/dashboard/dashboard-client.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { DashboardClient } from './dashboard-client'
import { UserProvider } from '@/lib/context/user-context'

const mockUser = {
  id: 'test-user',
  email: 'test@example.com',
  role: 'admin' as const,
  first_name: 'Test',
  last_name: 'User',
  profile_completed: true,
}

describe('DashboardClient', () => {
  it('should render hero section with welcome message', () => {
    render(
      <UserProvider user={mockUser}>
        <DashboardClient
          recentRegistrationsCount={5}
          pendingPaymentsCount={3}
          pendingPaymentsTotal={1500}
        />
      </UserProvider>
    )
    expect(screen.getByText(/Welcome, Admin/i)).toBeInTheDocument()
    expect(screen.getByText(/Here's what's happening today/i)).toBeInTheDocument()
  })

  it('should render all three quick action cards', () => {
    render(
      <UserProvider user={mockUser}>
        <DashboardClient
          recentRegistrationsCount={5}
          pendingPaymentsCount={3}
          pendingPaymentsTotal={1500}
        />
      </UserProvider>
    )
    expect(screen.getByText('Recent Registrations')).toBeInTheDocument()
    expect(screen.getByText('Pending Payments')).toBeInTheDocument()
    expect(screen.getByText('Create Schedule')).toBeInTheDocument()
  })

  it('should display correct stats', () => {
    render(
      <UserProvider user={mockUser}>
        <DashboardClient
          recentRegistrationsCount={7}
          pendingPaymentsCount={2}
          pendingPaymentsTotal={5000}
        />
      </UserProvider>
    )
    expect(screen.getByText('7 new')).toBeInTheDocument()
    expect(screen.getByText('2 items')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
npm test -- src/components/dashboard/dashboard-client.test.tsx
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/dashboard-client.tsx src/components/dashboard/dashboard-client.test.tsx
git commit -m "feat: add dashboard landing page with quick-action cards"
```

---

### Task 6: Create Dashboard Data Query Utilities

**Files:**
- Create: `src/lib/dashboard/queries.ts`

Dashboard needs real data for registrations and payments counts. Create server-side queries.

- [ ] **Step 1: Write queries for dashboard stats**

Create `src/lib/dashboard/queries.ts`:

```typescript
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Get count of recent registrations (last 5)
 * Used for Admin landing page card
 */
export async function getRecentRegistrationsCount(): Promise<number> {
  const supabase = createServiceClient()

  const { count, error } = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching registrations count:', error)
    return 0
  }

  return count ?? 0
}

/**
 * Get count and total of pending (unverified) payments
 * Used for Admin landing page card
 */
export async function getPendingPaymentsStats(): Promise<{
  count: number
  total: number
}> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('registrations')
    .select('id, price')
    .eq('payment_status', 'pending')

  if (error) {
    console.error('Error fetching pending payments:', error)
    return { count: 0, total: 0 }
  }

  const count = data?.length ?? 0
  const total = data?.reduce((sum, reg) => sum + (reg.price || 0), 0) ?? 0

  return { count, total }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/dashboard/queries.ts
git commit -m "feat: add dashboard data query utilities"
```

---

### Task 7: Update Dashboard Page to Use Landing Page Component

**Files:**
- Modify: `src/app/dashboard/page.tsx`

Replace the profile-only page with the dashboard landing page.

- [ ] **Step 1: Read current dashboard page**

```bash
cat src/app/dashboard/page.tsx
```

- [ ] **Step 2: Replace dashboard page**

Replace `src/app/dashboard/page.tsx`:

```typescript
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { getRecentRegistrationsCount, getPendingPaymentsStats } from '@/lib/dashboard/queries'

export default async function DashboardPage() {
  const [recentRegistrationsCount, pendingPaymentsStats] = await Promise.all([
    getRecentRegistrationsCount(),
    getPendingPaymentsStats(),
  ])

  return (
    <DashboardClient
      recentRegistrationsCount={recentRegistrationsCount}
      pendingPaymentsCount={pendingPaymentsStats.count}
      pendingPaymentsTotal={pendingPaymentsStats.total}
    />
  )
}
```

- [ ] **Step 3: Test the landing page in dev**

```bash
npm run dev
```

Navigate to http://localhost:3000/dashboard and verify:
- Hero section displays "Welcome, [Role]"
- Three quick-action cards render with proper stats
- Cards link to correct pages
- Animations stagger correctly

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: replace profile page with dashboard landing page"
```

---

### Task 8: Test Mobile and Desktop Breakpoint Transitions

**Files:**
- None (testing only)

- [ ] **Step 1: Test mobile view (< 1024px)**

Open dev server: `npm run dev`

Using browser DevTools, set viewport to mobile (375px width):
- [ ] Hamburger menu visible, sidebar hidden
- [ ] Tap hamburger → full-screen modal opens
- [ ] Modal shows categories with indented pages
- [ ] Tap a page → modal closes, navigates to page
- [ ] No bottom nav (verify bottom is clear)
- [ ] Top bar shows menu icon, logo, profile icon

- [ ] **Step 2: Test desktop view (≥ 1024px)**

Set viewport to desktop (1400px width):
- [ ] Sidebar visible (256px), hamburger hidden
- [ ] Categories organized by groups
- [ ] Active page highlighted with accent background
- [ ] Profile and Sign Out at bottom of sidebar
- [ ] Main content expands to fill available width
- [ ] No top bar nav (logo moved to sidebar)

- [ ] **Step 3: Test breakpoint transition (resize from mobile to desktop)**

- [ ] Resize browser from 375px to 1400px slowly
- [ ] At 1024px: hamburger transitions to sidebar
- [ ] Navigation remains functional throughout
- [ ] No layout shifts or visual glitches
- [ ] Content reflows smoothly

- [ ] **Step 4: Verify dark mode**

- [ ] All colors are readable in dark mode
- [ ] Contrast meets 4.5:1 standard
- [ ] Buttons and interactive elements have proper hover states
- [ ] Cards have subtle borders/backgrounds

- [ ] **Step 5: Commit a note if any fixes needed**

If issues found, fix in previous tasks and re-test. If all pass:

```bash
git log --oneline -8  # Verify commits
```

---

### Task 9: Verify Navigation Still Works on Other Pages

**Files:**
- None (integration testing)

- [ ] **Step 1: Navigate to schedules page**

```bash
npm run dev
```

Navigate to http://localhost:3000/dashboard/schedules:
- [ ] Schedules page loads correctly
- [ ] Navigation still renders (hamburger on mobile, sidebar on desktop)
- [ ] Current page highlighted in nav

- [ ] **Step 2: Navigate to users page**

Go to http://localhost:3000/dashboard/users:
- [ ] Users page loads
- [ ] Users nav item is active/highlighted
- [ ] Can navigate to other pages from here

- [ ] **Step 3: Navigate to payments page**

Go to http://localhost:3000/dashboard/payments:
- [ ] Payments page loads
- [ ] Payments category is visible and highlighted
- [ ] Links between pages work

- [ ] **Step 4: Test sign out flow**

Click Sign Out button:
- [ ] Redirects to /auth
- [ ] Can't access /dashboard without signing back in (middleware protection)

---

### Task 10: Final Commit and Cleanup

**Files:**
- None (all previous tasks)

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Verify all existing tests still pass and new tests pass.

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

Fix any linting errors.

- [ ] **Step 3: Final review of changes**

```bash
git log --oneline -10
git diff --stat HEAD~10
```

Verify all Phase 1 tasks are committed.

- [ ] **Step 4: Create summary commit (optional)**

If desired, create a summary commit:

```bash
git log --oneline | head -10
```

All Phase 1 tasks complete!

---

## Success Checklist

After completing all tasks, verify against success criteria:

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
- [ ] All tests pass
- [ ] Linter passes

---

## Next Steps (Phase 2 & 3)

After Phase 1 completes:

**Phase 2:** Facilitator & Player landing pages and navigation
**Phase 3:** Audit and redesign individual admin pages (schedules, users, payments, etc.)

