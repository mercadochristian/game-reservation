// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { FeaturedGameCard } from '@/components/featured-game-card'
import type { ScheduleWithLocation } from '@/types'

const mockGame: ScheduleWithLocation = {
  id: '1',
  title: 'Thursday Volleyball Game',
  location_id: 'loc1',
  start_time: '2026-03-31T11:00:00Z', // 7:00 PM Manila time (UTC+8)
  end_time: '2026-03-31T13:00:00Z', // 9:00 PM Manila time (UTC+8)
  max_players: 12,
  num_teams: 2,
  required_levels: ['developmental', 'intermediate'],
  status: 'open',
  created_by: 'user1',
  created_at: '2026-03-01',
  updated_at: '2026-03-01',
  position_prices: {},
  team_price: null,
  locations: {
    id: 'loc1',
    name: 'Makati Sports Complex',
    address: 'Makati City',
    google_map_url: 'https://maps.google.com',
  },
}

describe('FeaturedGameCard', () => {
  afterEach(() => {
    cleanup()
  })

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
    render(<FeaturedGameCard schedule={gameWithRegistrations} />)
    const spotsElement = screen.getByText('1 spot left')
    expect(spotsElement).toHaveClass('text-destructive')
  })

  it('should render Register link with correct href', () => {
    const gameWithRegistrations = { ...mockGame, registrations_count: 4 }
    render(<FeaturedGameCard schedule={gameWithRegistrations} />)
    const registerLink = screen.getByRole('link', { name: /register/i })
    expect(registerLink).toHaveAttribute('href', '/register?schedule_id=1')
  })

  it('should display Full and disable register when schedule is full', () => {
    const fullGame = { ...mockGame, registrations_count: 12 } // All 12 spots taken
    render(<FeaturedGameCard schedule={fullGame} />)
    const fullButtons = screen.getAllByText('Full')
    expect(fullButtons.length).toBe(2) // One in the text, one in the button
    const registerBtn = screen.queryByRole('link', { name: /register/i })
    expect(registerBtn).not.toBeInTheDocument()
  })
})
