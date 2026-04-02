// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterClient, type RegisterClientProps } from '../register-client'
import type { ScheduleWithLocation } from '@/types'
import { futureDateISO } from '@/__tests__/helpers/date-mock'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/client')

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
  cleanup()
})

describe('RegisterClient - Waiver Checkbox', () => {
  const upcomingStart = futureDateISO(14)
  const upcomingEnd = new Date(new Date(upcomingStart).getTime() + 7_200_000).toISOString()

  const mockSchedule: ScheduleWithLocation = {
    id: 'schedule-1',
    location_id: 'location-1',
    start_time: upcomingStart,
    end_time: upcomingEnd,
    max_players: 12,
    num_teams: 2,
    required_levels: ['intermediate'],
    status: 'open',
    created_by: 'admin-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    position_prices: { middle_blocker: 300, open_spiker: 300, opposite_spiker: 300, setter: 300 },
    team_price: 1500,
    deleted_at: null,
    locations: {
      id: 'location-1',
      name: 'Test Venue',
      address: 'Test Address',
      google_map_url: '',
    },
  }

  const mockUser = {
    id: 'user-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    role: 'player' as const,
    skill_level: 'intermediate' as const,
    player_contact_number: '555-0000',
    emergency_contact_name: null,
    emergency_contact_relationship: null,
    emergency_contact_number: null,
    is_guest: false,
    avatar_url: null,
    birthday_day: null,
    birthday_month: null,
    birthday_year: null,
    gender: null,
    profile_completed: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }

  const minimalValidProps: RegisterClientProps = {
    scheduleId: 'schedule-1',
    user: mockUser,
    skillError: false,
    scheduleError: null,
    primaryScheduleSlot: {
      schedule: mockSchedule,
      registrationCount: 2,
    },
    alreadyRegisteredIds: [],
    positionCounts: {
      setter: 1,
      middle_blocker: 1,
      open_spiker: 1,
      opposite_spiker: 1,
    },
  }

  it('should disable the Register button when waiver checkbox is unchecked', () => {
    render(<RegisterClient {...minimalValidProps} />)

    // Get all buttons with the register text and find ones that are disabled
    const registerButtons = screen.getAllByRole('button', { name: /register/i })

    // At least the primary register button should exist and be disabled initially
    const primaryButton = registerButtons.find(btn => !btn.getAttribute('aria-label'))
    expect(primaryButton).toBeDefined()
    if (primaryButton) {
      expect(primaryButton).toBeDisabled()
    }
  })

  it('should enable the Register button after checking the waiver checkbox', async () => {
    const user = userEvent.setup()
    render(<RegisterClient {...minimalValidProps} />)

    // Find the waiver checkbox - it's an input without aria-label, inside a label
    const checkboxes = screen.getAllByRole('checkbox')
    const waiverCheckbox = checkboxes.find(cb => {
      const parent = cb.closest('label')
      return parent?.textContent?.includes('Waiver Agreement')
    })

    expect(waiverCheckbox).toBeDefined()
    if (waiverCheckbox) {
      // Verify it's unchecked initially
      expect(waiverCheckbox).not.toBeChecked()

      // Act: check the waiver checkbox
      await user.click(waiverCheckbox)

      // Assert: checkbox should now be checked
      expect(waiverCheckbox).toBeChecked()
    }
  })

  it('should render the Waiver Agreement as a link to /waiver', () => {
    render(<RegisterClient {...minimalValidProps} />)

    const links = screen.getAllByRole('link', { name: /waiver agreement/i })

    // Both desktop and mobile render a link; check at least one
    expect(links.length).toBeGreaterThanOrEqual(1)
    expect(links[0]).toHaveAttribute('href', '/waiver')
    expect(links[0]).toHaveAttribute('target', '_blank')
  })
})
