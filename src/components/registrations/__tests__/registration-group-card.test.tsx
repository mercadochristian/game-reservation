// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RegistrationGroupCard } from '../registration-group-card'
import type { ScheduleWithSlots, RegistrationWithDetails } from '@/types'

const mockSchedule: ScheduleWithSlots = {
  id: 'sch-123',
  start_time: new Date('2026-04-01T18:00:00').toISOString(),
  end_time: new Date('2026-04-01T20:00:00').toISOString(),
  location_id: 'loc-1',
  max_players: 12,
  num_teams: 2,
  required_levels: ['developmental'],
  status: 'open',
  position_prices: {},
  team_price: 20,
  created_by: 'user-1',
  registration_count: 8,
  deleted_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  locations: {
    id: 'loc-1',
    name: 'North Court',
    address: '123 Main St',
    google_map_url: null,
  },
}

const mockRegistrations: RegistrationWithDetails[] = [
  {
    id: 'reg-1',
    schedule_id: 'sch-123',
    registered_by: 'user-1',
    player_id: 'user-1',
    team_preference: 'shuffle',
    payment_status: 'pending',
    payment_proof_url: null,
    attended: false,
    qr_token: null,
    preferred_position: 'setter',
    lineup_team_id: null,
    payment_channel_id: null,
    extracted_amount: null,
    extracted_reference: null,
    extracted_datetime: null,
    extracted_sender: null,
    extraction_confidence: null,
    extracted_raw: null,
    registration_note: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    users: {
      id: 'user-1',
      first_name: 'Sarah',
      last_name: 'Chen',
      email: 'sarah@example.com',
      skill_level: 'advanced',
      is_guest: false,
    },
    team_members: [],
  },
]

describe('RegistrationGroupCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render game header with date, time, and registration count', () => {
    render(
      <RegistrationGroupCard
        schedule={mockSchedule}
        registrations={mockRegistrations}
        isExpanded={true}
        onToggleExpand={() => {}}
        isPastGame={false}
      />
    )
    // Should show the date in some form (Apr 1)
    expect(screen.getByText(/Apr 1/)).toBeInTheDocument()
    // Should show location name
    expect(screen.getByText(/North Court/)).toBeInTheDocument()
    // Should show registration count
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('should toggle expanded/collapsed state when header is clicked', () => {
    const onToggle = vi.fn()
    const { container } = render(
      <RegistrationGroupCard
        schedule={mockSchedule}
        registrations={mockRegistrations}
        isExpanded={true}
        onToggleExpand={onToggle}
        isPastGame={false}
      />
    )
    // Find the button (header button)
    const buttons = container.querySelectorAll('button')
    const headerButton = buttons[0]
    fireEvent.click(headerButton)
    expect(onToggle).toHaveBeenCalledWith('sch-123')
  })

  it('should show registrations table when expanded', () => {
    const { container } = render(
      <RegistrationGroupCard
        schedule={mockSchedule}
        registrations={mockRegistrations}
        isExpanded={true}
        onToggleExpand={() => {}}
        isPastGame={false}
      />
    )
    // Check if table body exists (expanded shows table)
    const tableBody = container.querySelector('tbody')
    expect(tableBody).not.toBeNull()
    // Check that player name is in the rendered content
    expect(container.textContent).toContain('Sarah Chen')
  })

  it('should hide registrations table when collapsed', () => {
    const { container } = render(
      <RegistrationGroupCard
        schedule={mockSchedule}
        registrations={mockRegistrations}
        isExpanded={false}
        onToggleExpand={() => {}}
        isPastGame={false}
      />
    )
    // Check if table body exists and is visible
    const tableBody = container.querySelector('tbody')
    // If collapsed, table should not be rendered at all
    expect(tableBody).toBeNull()
  })

  it('should not show action buttons for past games', () => {
    const { container } = render(
      <RegistrationGroupCard
        schedule={mockSchedule}
        registrations={mockRegistrations}
        isExpanded={true}
        onToggleExpand={() => {}}
        isPastGame={true}
      />
    )
    const buttons = container.querySelectorAll('button')
    const buttonTexts = Array.from(buttons).map((b) => b.textContent)
    expect(buttonTexts.some((text) => text?.includes('Register Player'))).toBe(false)
    expect(buttonTexts.some((text) => text?.includes('Manage Lineups'))).toBe(false)
  })

  it('should show action buttons for upcoming games', () => {
    const { container } = render(
      <RegistrationGroupCard
        schedule={mockSchedule}
        registrations={mockRegistrations}
        isExpanded={true}
        onToggleExpand={() => {}}
        isPastGame={false}
      />
    )
    const buttons = container.querySelectorAll('button')
    const buttonTexts = Array.from(buttons).map((b) => b.textContent)
    expect(buttonTexts.some((text) => text?.includes('Register Player'))).toBe(true)
    expect(buttonTexts.some((text) => text?.includes('Manage Lineups'))).toBe(true)
  })

  it('should show empty state when no registrations', () => {
    render(
      <RegistrationGroupCard
        schedule={mockSchedule}
        registrations={[]}
        isExpanded={true}
        onToggleExpand={() => {}}
        isPastGame={false}
      />
    )
    expect(screen.getByText(/No registrations yet/i)).toBeInTheDocument()
  })

  it('should render table with correct columns when expanded with registrations', () => {
    const { container } = render(
      <RegistrationGroupCard
        schedule={mockSchedule}
        registrations={mockRegistrations}
        isExpanded={true}
        onToggleExpand={() => {}}
        isPastGame={false}
      />
    )
    // Check that table headers exist
    expect(container.textContent).toContain('Player')
    expect(container.textContent).toContain('Position')
    expect(container.textContent).toContain('Skill Level')
    expect(container.textContent).toContain('Payment')
  })

  it('should call onRegisterPlayer when Register Player button is clicked', () => {
    const onRegisterPlayer = vi.fn()
    const { container } = render(
      <RegistrationGroupCard
        schedule={mockSchedule}
        registrations={mockRegistrations}
        isExpanded={true}
        onToggleExpand={() => {}}
        isPastGame={false}
        onRegisterPlayer={onRegisterPlayer}
      />
    )
    const buttons = Array.from(container.querySelectorAll('button'))
    const registerButton = buttons.find((b) => b.textContent?.includes('Register Player'))
    if (!registerButton) throw new Error('Register Player button not found')
    fireEvent.click(registerButton)
    expect(onRegisterPlayer).toHaveBeenCalledWith('sch-123')
  })

  it('should call onManageLineups when Manage Lineups button is clicked', () => {
    const onManageLineups = vi.fn()
    const { container } = render(
      <RegistrationGroupCard
        schedule={mockSchedule}
        registrations={mockRegistrations}
        isExpanded={true}
        onToggleExpand={() => {}}
        isPastGame={false}
        onManageLineups={onManageLineups}
      />
    )
    const buttons = Array.from(container.querySelectorAll('button'))
    const manageButton = buttons.find((b) => b.textContent?.includes('Manage Lineups'))
    if (!manageButton) throw new Error('Manage Lineups button not found')
    fireEvent.click(manageButton)
    expect(onManageLineups).toHaveBeenCalledWith('sch-123')
  })
})
