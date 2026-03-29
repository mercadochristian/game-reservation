// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeaturedGamesSection } from '@/components/featured-games-section'
import type { ScheduleWithLocation } from '@/types'

const mockGames: (ScheduleWithLocation & {
  registrations_count: number
  position_counts: Record<string, number>
})[] = [
  {
    id: '1',
    title: 'Thursday Volleyball Game',
    location_id: 'loc1',
    start_time: '2026-03-31T19:00:00Z',
    end_time: '2026-03-31T21:00:00Z',
    max_players: 12,
    num_teams: 2,
    required_levels: ['developmental', 'intermediate'],
    status: 'open',
    created_by: 'user1',
    created_at: '2026-03-01',
    updated_at: '2026-03-01',
    position_prices: {},
    team_price: null,
    registrations_count: 4,
    position_counts: {
      open_spiker: 2,
      opposite_spiker: 1,
      middle_blocker: 1,
      setter: 0,
    },
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
    expect(screen.getAllByText('Makati Sports Complex')[0]).toBeInTheDocument()
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
