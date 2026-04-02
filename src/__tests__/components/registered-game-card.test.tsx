// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisteredGameCard } from '@/components/registered-game-card'
import type { ScheduleWithLocation, Registration } from '@/types'

const mockSchedule: ScheduleWithLocation = {
  id: 'schedule-1',
  location_id: 'loc-1',
  start_time: '2026-03-31T11:00:00Z', // 7:00 PM Manila time (UTC+8)
  end_time: '2026-03-31T13:00:00Z', // 9:00 PM Manila time (UTC+8)
  max_players: 12,
  num_teams: 2,
  required_levels: ['developmental', 'intermediate'],
  status: 'open',
  created_by: 'user-1',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  position_prices: {},
  team_price: null,
  deleted_at: null,
  locations: {
    id: 'loc-1',
    name: 'Makati Sports Complex',
    address: 'Makati City, Philippines',
    google_map_url: 'https://maps.google.com',
  },
}

const mockRegistration: Registration = {
  id: 'reg-1',
  schedule_id: 'schedule-1',
  registered_by: 'user-2',
  player_id: 'player-1',
  team_preference: 'shuffle',
  attended: false,
  qr_token: 'qr-token-12345',
  preferred_position: 'middle_blocker',
  lineup_team_id: null,
  registration_note: null,
  created_at: '2026-03-15T00:00:00Z',
  updated_at: '2026-03-15T00:00:00Z',
}

describe('RegisteredGameCard', () => {
  afterEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  it('should display formatted date and time', () => {
    const onShowQR = vi.fn()
    render(
      <RegisteredGameCard
        schedule={mockSchedule}
        registration={mockRegistration}
        onShowQR={onShowQR}
      />
    )
    expect(screen.getByText(/Mar/)).toBeInTheDocument()
    expect(screen.getByText(/7:00 PM/)).toBeInTheDocument()
  })

  it('should display location name and address', () => {
    const onShowQR = vi.fn()
    render(
      <RegisteredGameCard
        schedule={mockSchedule}
        registration={mockRegistration}
        onShowQR={onShowQR}
      />
    )
    expect(screen.getByText('Makati Sports Complex')).toBeInTheDocument()
    expect(screen.getByText('Makati City, Philippines')).toBeInTheDocument()
  })

  it('should display position label', () => {
    const onShowQR = vi.fn()
    render(
      <RegisteredGameCard
        schedule={mockSchedule}
        registration={mockRegistration}
        onShowQR={onShowQR}
      />
    )
    expect(screen.getByText('Middle Blocker')).toBeInTheDocument()
  })

  it('should call onShowQR callback when Show QR button is clicked', async () => {
    const onShowQR = vi.fn()
    render(
      <RegisteredGameCard
        schedule={mockSchedule}
        registration={mockRegistration}
        onShowQR={onShowQR}
      />
    )
    const button = screen.getByRole('button', { name: /Show QR/i })
    await userEvent.click(button)
    expect(onShowQR).toHaveBeenCalledOnce()
    expect(onShowQR).toHaveBeenCalledWith(mockSchedule, mockRegistration)
  })
})
