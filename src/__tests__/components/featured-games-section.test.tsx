// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeaturedGamesSection } from '@/components/featured-games-section'
import type { ScheduleWithLocation } from '@/types'
import { futureDateISO } from '@/__tests__/helpers/date-mock'

const mockGames: (ScheduleWithLocation & {
  registrations_count: number
  position_counts: Record<string, number>
})[] = [
  {
    id: '1',
    location_id: 'loc1',
    start_time: futureDateISO(1),
    end_time: new Date(new Date(futureDateISO(1)).getTime() + 7_200_000).toISOString(),
    max_players: 12,
    num_teams: 2,
    required_levels: ['developmental', 'intermediate'],
    status: 'open',
    created_by: 'user1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    position_prices: {},
    team_price: null,
    registrations_count: 4,
    deleted_at: null,
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
