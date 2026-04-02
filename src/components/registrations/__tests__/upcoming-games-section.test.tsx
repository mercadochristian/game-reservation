// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UpcomingGamesSection } from '../upcoming-games-section'
import { futureDateISO } from '@/__tests__/helpers/date-mock'
import type { ScheduleWithSlots } from '@/types'

const mockSchedules: ScheduleWithSlots[] = Array.from({ length: 12 }, (_, i) => ({
  id: `sch-${i}`,
  title: `Game ${i + 1}`,
  start_time: futureDateISO(i + 1),
  end_time: new Date(new Date(futureDateISO(i + 1)).getTime() + 7_200_000).toISOString(),
  location_id: 'loc-1',
  max_players: 12,
  num_teams: 2,
  required_levels: ['developmental'],
  status: 'open' as const,
  position_prices: {},
  team_price: 20,
  created_by: 'user-1',
  registration_count: i + 1,
  deleted_at: null,
  discount_type: null,
  discount_value: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  locations: {
    id: 'loc-1',
    name: 'North Court',
    address: '123 Main St',
    google_map_url: null,
  },
}))

describe('UpcomingGamesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render section header with game count', () => {
    render(
      <UpcomingGamesSection
        schedules={mockSchedules}
        registrationsByScheduleId={{}}
        expandedScheduleIds={new Set()}
        onToggleExpand={() => {}}
        onRegisterPlayer={() => {}}
        onManageLineups={() => {}}
        currentPage={1}
        pageSize={10}
        onPageChange={() => {}}
      />
    )
    expect(screen.getByText(/UPCOMING GAMES/)).toBeInTheDocument()
    expect(screen.getByText(/\(12\)/)).toBeInTheDocument()
  })

  it('should paginate games (show 10 per page)', () => {
    const { container } = render(
      <UpcomingGamesSection
        schedules={mockSchedules}
        registrationsByScheduleId={{}}
        expandedScheduleIds={new Set()}
        onToggleExpand={() => {}}
        onRegisterPlayer={() => {}}
        onManageLineups={() => {}}
        currentPage={1}
        pageSize={10}
        onPageChange={() => {}}
      />
    )
    const gameCardsContainer = container.querySelector('.space-y-4')
    const gameCards = gameCardsContainer?.querySelectorAll('[aria-label*="Expand/collapse registrations"]')
    expect(gameCards?.length).toBe(10)
  })

  it('should display pagination controls when games exceed page size', () => {
    render(
      <UpcomingGamesSection
        schedules={mockSchedules}
        registrationsByScheduleId={{}}
        expandedScheduleIds={new Set()}
        onToggleExpand={() => {}}
        onRegisterPlayer={() => {}}
        onManageLineups={() => {}}
        currentPage={1}
        pageSize={10}
        onPageChange={() => {}}
      />
    )
    const paginationControls = screen.getAllByText(/Showing 1–10 of 12 results/)
    expect(paginationControls.length).toBeGreaterThan(0)
  })

  it('should show empty state when no upcoming games', () => {
    render(
      <UpcomingGamesSection
        schedules={[]}
        registrationsByScheduleId={{}}
        expandedScheduleIds={new Set()}
        onToggleExpand={() => {}}
        onRegisterPlayer={() => {}}
        onManageLineups={() => {}}
        currentPage={1}
        pageSize={10}
        onPageChange={() => {}}
      />
    )
    expect(screen.getByText(/No upcoming games/)).toBeInTheDocument()
  })
})
