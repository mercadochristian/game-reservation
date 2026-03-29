// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'
import type { ScheduleWithLocation } from '@/types'
import { ScheduleInfo } from '../schedule-info'

// A fixed UTC time: 2026-03-20T06:30:00Z → Asia/Manila = Fri Mar 20, 2:30 PM
const mockSchedule: ScheduleWithLocation = {
  id: 'sched-1',
  title: 'Weekly Volleyball Game',
  location_id: 'loc-1',
  start_time: '2026-03-20T06:30:00+00:00',
  end_time: '2026-03-20T10:00:00+00:00',
  max_players: 20,
  num_teams: 2,
  required_levels: ['developmental', 'intermediate'],
  status: 'open',
  created_by: 'admin-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  position_prices: { setter: 100, spiker: 100, libero: 100 },
  team_price: null,
  locations: { id: 'loc-1', name: 'Downtown Gym', address: null, google_map_url: null },
}

describe('ScheduleInfo', () => {
  afterEach(() => {
    cleanup()
  })

  it('is exported as a memo-wrapped component', () => {
    expect((ScheduleInfo as any).$$typeof?.toString()).toContain('react.memo')
  })

  describe('compact mode', () => {
    it('renders a span element (not a div) with the schedule label', () => {
      const { container } = render(
        <ScheduleInfo schedule={mockSchedule} compact={true} />
      )
      const span = container.querySelector('span')
      expect(span).not.toBeNull()
      // The label should include the location name
      expect(span!.textContent).toContain('Downtown Gym')
    })

    it('applies the className prop to the span in compact mode', () => {
      const { container } = render(
        <ScheduleInfo schedule={mockSchedule} compact={true} className="my-custom-class" />
      )
      const span = container.querySelector('span')
      expect(span!.className).toContain('my-custom-class')
    })
  })

  describe('default mode (non-compact)', () => {
    it('renders the location name', () => {
      render(<ScheduleInfo schedule={mockSchedule} />)
      expect(screen.getByText('Downtown Gym')).toBeDefined()
    })

    it('renders a date string containing the day and month', () => {
      render(<ScheduleInfo schedule={mockSchedule} />)
      // formatScheduleDateWithWeekday returns e.g. "Fri, Mar 20"
      const dateEl = screen.getByText(/Mar 20/i)
      expect(dateEl).toBeDefined()
    })

    it('renders a time range with start and end times', () => {
      render(<ScheduleInfo schedule={mockSchedule} />)
      // The time display should contain a dash/dash character between start and end
      const timeEl = screen.getByText(/–/)
      expect(timeEl).toBeDefined()
      expect(timeEl.textContent).toContain('PM')
    })

    it('uses "Unknown Location" when locations is null', () => {
      const scheduleWithoutLocation: ScheduleWithLocation = {
        ...mockSchedule,
        locations: null as unknown as ScheduleWithLocation['locations'],
      }
      render(<ScheduleInfo schedule={scheduleWithoutLocation} />)
      expect(screen.getByText('Unknown Location')).toBeDefined()
    })

    it('applies the className prop to the wrapper div', () => {
      const { container } = render(
        <ScheduleInfo schedule={mockSchedule} className="wrapper-class" />
      )
      const div = container.querySelector('div')
      expect(div!.className).toContain('wrapper-class')
    })
  })
})
