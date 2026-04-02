import { describe, it, expect } from 'vitest'
import { formatScheduleLabel } from '../schedule-label'
import type { ScheduleWithLocation } from '@/types'

describe('formatScheduleLabel', () => {
  const mockSchedule: ScheduleWithLocation = {
    id: '123',
    start_time: '2026-03-20T19:00:00Z', // Friday, March 20, 2026 at 7:00 PM UTC (3:00 AM+8 Saturday)
    end_time: '2026-03-20T21:00:00Z', // 9:00 PM UTC (5:00 AM+8 Saturday)
    location_id: 'loc-1',
    max_players: 18,
    num_teams: 2,
    required_levels: [],
    status: 'open',
    position_prices: {},
    team_price: 0,
    deleted_at: null,
    discount_type: null,
    discount_value: null,
    created_at: '2026-03-01T00:00:00Z',
    created_by: 'admin-1',
    updated_at: '2026-03-01T00:00:00Z',
    locations: {
      id: 'loc-1',
      name: 'Makati Sports Complex',
      address: null,
      google_map_url: null,
    },
  }

  it('returns formatted label with location, date, and time', () => {
    const label = formatScheduleLabel(mockSchedule)
    expect(label).toContain('Makati Sports Complex')
    expect(label).toContain('·')
    expect(label).toMatch(/\d{1,2}:\d{2}\s(?:AM|PM)/)
  })

  it('includes location name from locations object', () => {
    const label = formatScheduleLabel(mockSchedule)
    expect(label).toContain('Makati Sports Complex')
  })

  it('falls back to "Unknown Location" when locations.name is null', () => {
    const schedule: ScheduleWithLocation = { ...mockSchedule, locations: { id: 'loc-1', name: null as any, address: null, google_map_url: null } }
    const label = formatScheduleLabel(schedule)
    expect(label).toContain('Unknown Location')
  })

  it('uses Manila timezone for formatting (not UTC)', () => {
    const label = formatScheduleLabel(mockSchedule)
    // The schedule times are UTC, but should be formatted in Manila timezone (+8)
    // 2026-03-20T19:00:00Z = Saturday 2026-03-21T03:00:00+08:00 in Manila
    // 2026-03-20T21:00:00Z = Saturday 2026-03-21T05:00:00+08:00 in Manila
    // Should show Saturday (next day) with times adjusted
    expect(label).toMatch(/Saturday|Sat/)
  })

  it('includes both start and end times separated by en-dash', () => {
    const label = formatScheduleLabel(mockSchedule)
    expect(label).toMatch(/\d{1,2}:\d{2}\s(?:AM|PM)\s+–\s+\d{1,2}:\d{2}\s(?:AM|PM)/)
  })
})
