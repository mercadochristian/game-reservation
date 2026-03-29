// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PastGamesSection } from '../past-games-section'
import type { ScheduleWithSlots } from '@/types'

const mockSchedules: ScheduleWithSlots[] = Array.from({ length: 5 }, (_, i) => ({
  id: `sch-${i}`,
  start_time: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
  end_time: new Date(Date.now() - (i + 1) * 86400000 + 7200000).toISOString(),
  location_id: 'loc-1',
  max_players: 12,
  registration_count: i + 1,
  price: 20,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  locations: { id: 'loc-1', name: 'North Court', address: '123 Main St', google_map_url: null },
}))

describe('PastGamesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render section header showing count', () => {
    render(
      <PastGamesSection
        schedules={mockSchedules}
        registrationsByScheduleId={{}}
        expandedScheduleIds={new Set()}
        isExpanded={false}
        onToggleSectionExpand={() => {}}
        onToggleGameExpand={() => {}}
        currentPage={1}
        pageSize={10}
        onPageChange={() => {}}
      />
    )
    expect(screen.getByText(/PAST GAMES/)).toBeInTheDocument()
    expect(screen.getByText(/5/)).toBeInTheDocument()
  })

  it('should be collapsed by default', () => {
    render(
      <PastGamesSection
        schedules={mockSchedules}
        registrationsByScheduleId={{}}
        expandedScheduleIds={new Set()}
        isExpanded={false}
        onToggleSectionExpand={() => {}}
        onToggleGameExpand={() => {}}
        currentPage={1}
        pageSize={10}
        onPageChange={() => {}}
      />
    )
    expect(screen.queryByText(/North Court/)).not.toBeInTheDocument()
  })

  it('should expand when header is clicked', () => {
    const onToggle = vi.fn()
    const { container } = render(
      <PastGamesSection
        schedules={mockSchedules}
        registrationsByScheduleId={{}}
        expandedScheduleIds={new Set()}
        isExpanded={false}
        onToggleSectionExpand={onToggle}
        onToggleGameExpand={() => {}}
        currentPage={1}
        pageSize={10}
        onPageChange={() => {}}
      />
    )
    const headerButton = container.querySelector('button')
    fireEvent.click(headerButton!)
    expect(onToggle).toHaveBeenCalled()
  })

  it('should show games when expanded', () => {
    const { container } = render(
      <PastGamesSection
        schedules={mockSchedules}
        registrationsByScheduleId={{}}
        expandedScheduleIds={new Set()}
        isExpanded={true}
        onToggleSectionExpand={() => {}}
        onToggleGameExpand={() => {}}
        currentPage={1}
        pageSize={10}
        onPageChange={() => {}}
      />
    )
    const content = container.querySelector('.space-y-4')
    expect(content).toBeInTheDocument()
    expect(screen.getAllByText(/North Court/).length).toBeGreaterThan(0)
  })

  it('should show empty state when no past games', () => {
    render(
      <PastGamesSection
        schedules={[]}
        registrationsByScheduleId={{}}
        expandedScheduleIds={new Set()}
        isExpanded={true}
        onToggleSectionExpand={() => {}}
        onToggleGameExpand={() => {}}
        currentPage={1}
        pageSize={10}
        onPageChange={() => {}}
      />
    )
    expect(screen.getByText(/No past games at this location/)).toBeInTheDocument()
  })
})
