// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks (declared before imports that depend on them)
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

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

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    width,
    height,
    className,
  }: {
    src: string
    alt: string
    width: number
    height: number
    className?: string
  }) => React.createElement('img', { src, alt, width, height, className }),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      React.createElement('div', props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
    React.createElement('button', { ...props, onClick }, children),
}))

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AppShell } from '../app-shell'
import { UserProvider } from '@/lib/context/user-context'
import type { User } from '@/types'

// ---------------------------------------------------------------------------
// Helper: build a mock user object
// ---------------------------------------------------------------------------

function buildMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    first_name: 'Jane',
    last_name: 'Smith',
    role: 'player',
    skill_level: 'intermediate',
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
// Helper: render AppShell wrapped in UserProvider
// ---------------------------------------------------------------------------

function renderAppShell(user: User | null) {
  return render(
    <UserProvider user={user}>
      <AppShell>
        <div>content</div>
      </AppShell>
    </UserProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AppShell', () => {
  let mockPush: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockPush = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)
    vi.mocked(createClient).mockReturnValue({
      auth: { getUser: vi.fn(), signOut: vi.fn().mockResolvedValue({}) },
      from: vi.fn(),
    } as any)
  })

  afterEach(() => {
    cleanup()
  })

  // -------------------------------------------------------------------------
  // displayName rendering
  // -------------------------------------------------------------------------

  describe('displayName from context', () => {
    it('shows full name when both first and last name are set', () => {
      renderAppShell(buildMockUser({ first_name: 'Jane', last_name: 'Smith' }))
      expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0)
    })

    it('shows first name only when last_name is null', () => {
      renderAppShell(buildMockUser({ first_name: 'Jane', last_name: null }))
      expect(screen.getAllByText('Jane').length).toBeGreaterThan(0)
    })

    it('does not render a name when both first_name and last_name are null', () => {
      renderAppShell(buildMockUser({ first_name: null, last_name: null }))
      expect(screen.queryByText('null null')).toBeNull()
      expect(screen.queryByText(' ')).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // displaySubtitle rendering
  // -------------------------------------------------------------------------

  describe('displaySubtitle from context', () => {
    const cases: Array<{
      role: User['role']
      skillLevel: string | null
      expected: string
    }> = [
      { role: 'admin', skillLevel: null, expected: 'Admin' },
      { role: 'super_admin', skillLevel: null, expected: 'Super Admin' },
      { role: 'facilitator', skillLevel: null, expected: 'Facilitator' },
      { role: 'player', skillLevel: null, expected: 'Player' },
      { role: 'player', skillLevel: 'intermediate', expected: 'Intermediate' },
      { role: 'player', skillLevel: 'advanced', expected: 'Advanced' },
      { role: 'player', skillLevel: 'developmental', expected: 'Developmental' },
    ]

    for (const { role, skillLevel, expected } of cases) {
      it(`shows "${expected}" for role="${role}" skill="${skillLevel}"`, () => {
        renderAppShell(buildMockUser({
          role,
          skill_level: skillLevel as any,
          first_name: 'Test',
          last_name: 'User',
        }))
        expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
      })
    }
  })

  // -------------------------------------------------------------------------
  // handleSignOut
  // -------------------------------------------------------------------------

  describe('handleSignOut', () => {
    it('calls supabase.auth.signOut() and pushes /auth', async () => {
      const signOut = vi.fn().mockResolvedValue({})
      vi.mocked(createClient).mockReturnValue({
        auth: { getUser: vi.fn(), signOut },
        from: vi.fn(),
      } as any)

      renderAppShell(buildMockUser())

      const allButtons = screen.getAllByRole('button')
      const signOutButton = allButtons.find(
        (btn) => btn.textContent?.includes('Sign Out')
      )
      expect(signOutButton).toBeDefined()
      await act(async () => {
        fireEvent.click(signOutButton!)
      })

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10))
      })

      expect(signOut).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith('/auth')
    })
  })

  // -------------------------------------------------------------------------
  // Renders nothing when user is null (no role)
  // -------------------------------------------------------------------------

  describe('null user context', () => {
    it('renders nothing when user is null', () => {
      const { container } = renderAppShell(null)
      // AppShell returns null when !role
      expect(container.innerHTML).toBe('')
    })
  })

  // -------------------------------------------------------------------------
  // Navigation items rendering based on user role from context
  // -------------------------------------------------------------------------

  describe('navigation items from context role', () => {
    it('renders admin nav items for admin user', () => {
      renderAppShell(buildMockUser({ role: 'admin' }))
      expect(screen.getAllByText('Registrations').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Payments').length).toBeGreaterThan(0)
    })

    it('renders player nav items for player user', () => {
      renderAppShell(buildMockUser({ role: 'player' }))
      expect(screen.getAllByText('Register').length).toBeGreaterThan(0)
    })

    it('renders facilitator nav items for facilitator user', () => {
      renderAppShell(buildMockUser({ role: 'facilitator' }))
      expect(screen.getAllByText('QR Scanner').length).toBeGreaterThan(0)
    })
  })
})

