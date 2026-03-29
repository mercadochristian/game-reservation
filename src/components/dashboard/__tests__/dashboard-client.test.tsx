// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'
import { DashboardClient } from '../dashboard-client'
import { UserProvider } from '@/lib/context/user-context'
import type { User } from '@/types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => React.createElement('a', { href, className }, children),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      React.createElement('div', props, children),
  },
}))

vi.mock('lucide-react', () => ({
  Users: (props: any) => React.createElement('div', { ...props, 'data-testid': 'icon-users' }),
  CreditCard: (props: any) => React.createElement('div', { ...props, 'data-testid': 'icon-creditcard' }),
  CalendarDays: (props: any) => React.createElement('div', { ...props, 'data-testid': 'icon-calendar' }),
}))

// ---------------------------------------------------------------------------
// Helper: build a mock user object
// ---------------------------------------------------------------------------

function buildMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    first_name: 'Jane',
    last_name: 'Smith',
    role: 'admin',
    skill_level: null,
    avatar_url: null,
    birthday_month: null,
    birthday_day: null,
    birthday_year: null,
    gender: null,
    emergency_contact_name: null,
    emergency_contact_relationship: null,
    emergency_contact_number: null,
    player_contact_number: null,
    profile_completed: true,
    is_guest: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Helper: render DashboardClient wrapped in UserProvider
// ---------------------------------------------------------------------------

function renderDashboard(
  user: User,
  props: {
    recentRegistrationsCount: number
    pendingPaymentsCount: number
    pendingPaymentsTotal: number
  }
) {
  return render(
    <UserProvider user={user}>
      <DashboardClient {...props} />
    </UserProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DashboardClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('hero section', () => {
    it('should render welcome message with user role', () => {
      const user = buildMockUser({ role: 'admin' })
      renderDashboard(user, {
        recentRegistrationsCount: 5,
        pendingPaymentsCount: 3,
        pendingPaymentsTotal: 150,
      })
      expect(screen.getByText(/Welcome, Admin/)).toBeInTheDocument()
    })

    it('should render hero subtitle', () => {
      const user = buildMockUser({ role: 'player' })
      renderDashboard(user, {
        recentRegistrationsCount: 0,
        pendingPaymentsCount: 0,
        pendingPaymentsTotal: 0,
      })
      expect(screen.getByText("Here's what's happening today")).toBeInTheDocument()
    })

    it('should show "Player" role in welcome for player users', () => {
      const user = buildMockUser({ role: 'player' })
      renderDashboard(user, {
        recentRegistrationsCount: 0,
        pendingPaymentsCount: 0,
        pendingPaymentsTotal: 0,
      })
      expect(screen.getByText(/Welcome, Player/)).toBeInTheDocument()
    })

    it('should show "Facilitator" role in welcome for facilitator users', () => {
      const user = buildMockUser({ role: 'facilitator' })
      renderDashboard(user, {
        recentRegistrationsCount: 0,
        pendingPaymentsCount: 0,
        pendingPaymentsTotal: 0,
      })
      expect(screen.getByText(/Welcome, Facilitator/)).toBeInTheDocument()
    })
  })

  describe('quick-action cards', () => {
    it('should render Recent Registrations card with correct stat', () => {
      renderDashboard(buildMockUser(), {
        recentRegistrationsCount: 5,
        pendingPaymentsCount: 0,
        pendingPaymentsTotal: 0,
      })
      expect(screen.getByText('Recent Registrations')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should render Pending Payments card with count and items', () => {
      renderDashboard(buildMockUser(), {
        recentRegistrationsCount: 0,
        pendingPaymentsCount: 3,
        pendingPaymentsTotal: 0,
      })
      expect(screen.getByText('Pending Payments')).toBeInTheDocument()
      expect(screen.getByText('3 items')).toBeInTheDocument()
    })

    it('should render Create Schedule card with quick action label', () => {
      renderDashboard(buildMockUser(), {
        recentRegistrationsCount: 0,
        pendingPaymentsCount: 0,
        pendingPaymentsTotal: 0,
      })
      expect(screen.getByText('Create Schedule')).toBeInTheDocument()
      expect(screen.getByText('Quick action')).toBeInTheDocument()
    })

    it('should render all 3 cards', () => {
      renderDashboard(buildMockUser(), {
        recentRegistrationsCount: 10,
        pendingPaymentsCount: 5,
        pendingPaymentsTotal: 500,
      })
      const cards = screen.getAllByRole('link')
      const dashboardCards = cards.filter(
        (link) =>
          link.getAttribute('href') === '/dashboard/registrations' ||
          link.getAttribute('href') === '/dashboard/payments' ||
          link.getAttribute('href') === '/dashboard/schedules'
      )
      expect(dashboardCards.length).toBe(3)
    })
  })

  describe('card links', () => {
    it('should link Recent Registrations card to /dashboard/registrations', () => {
      renderDashboard(buildMockUser(), {
        recentRegistrationsCount: 5,
        pendingPaymentsCount: 0,
        pendingPaymentsTotal: 0,
      })
      const link = screen.getAllByRole('link').find((link) => {
        return link.getAttribute('href') === '/dashboard/registrations'
      })
      expect(link).toBeInTheDocument()
    })

    it('should link Pending Payments card to /dashboard/payments', () => {
      renderDashboard(buildMockUser(), {
        recentRegistrationsCount: 0,
        pendingPaymentsCount: 3,
        pendingPaymentsTotal: 0,
      })
      const link = screen.getAllByRole('link').find((link) => {
        return link.getAttribute('href') === '/dashboard/payments'
      })
      expect(link).toBeInTheDocument()
    })

    it('should link Create Schedule card to /dashboard/schedules', () => {
      renderDashboard(buildMockUser(), {
        recentRegistrationsCount: 0,
        pendingPaymentsCount: 0,
        pendingPaymentsTotal: 0,
      })
      const link = screen.getAllByRole('link').find((link) => {
        return link.getAttribute('href') === '/dashboard/schedules'
      })
      expect(link).toBeInTheDocument()
    })
  })

  describe('stats display', () => {
    it('should display 0 registrations when count is 0', () => {
      renderDashboard(buildMockUser(), {
        recentRegistrationsCount: 0,
        pendingPaymentsCount: 0,
        pendingPaymentsTotal: 0,
      })
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('should display correct count for multiple registrations', () => {
      renderDashboard(buildMockUser(), {
        recentRegistrationsCount: 42,
        pendingPaymentsCount: 0,
        pendingPaymentsTotal: 0,
      })
      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('should display 0 items for pending payments when count is 0', () => {
      renderDashboard(buildMockUser(), {
        recentRegistrationsCount: 0,
        pendingPaymentsCount: 0,
        pendingPaymentsTotal: 0,
      })
      const zeroItems = screen.getByText('0 items')
      expect(zeroItems).toBeInTheDocument()
    })

    it('should display 1 item (singular) for single pending payment', () => {
      renderDashboard(buildMockUser(), {
        recentRegistrationsCount: 0,
        pendingPaymentsCount: 1,
        pendingPaymentsTotal: 0,
      })
      expect(screen.getByText('1 items')).toBeInTheDocument()
    })
  })
})
