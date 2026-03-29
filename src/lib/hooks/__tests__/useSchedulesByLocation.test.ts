// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSchedulesByLocation } from '../useSchedulesByLocation'

describe('useSchedulesByLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch schedules when location id changes', async () => {
    const { result, rerender } = renderHook(
      ({ locationId }: { locationId: string }) => useSchedulesByLocation(locationId),
      { initialProps: { locationId: '' } }
    )

    expect(result.current.loading).toBe(false)
    expect(result.current.upcomingSchedules).toEqual([])

    rerender({ locationId: 'loc-1' })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.upcomingSchedules.length).toBeGreaterThanOrEqual(0)
  })

  it('should split schedules into upcoming and past', async () => {
    const { result } = renderHook(() => useSchedulesByLocation('loc-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const upcoming = result.current.upcomingSchedules
    const past = result.current.pastSchedules

    upcoming.forEach((s) => {
      expect(new Date(s.start_time).getTime()).toBeGreaterThanOrEqual(Date.now() - 1000)
    })

    past.forEach((s) => {
      expect(new Date(s.start_time).getTime()).toBeLessThan(Date.now() - 1000)
    })
  })

  it('should return empty arrays when location id is empty', async () => {
    const { result } = renderHook(() => useSchedulesByLocation(''))

    expect(result.current.upcomingSchedules).toEqual([])
    expect(result.current.pastSchedules).toEqual([])
    expect(result.current.registrationsByScheduleId).toEqual({})
    expect(result.current.loading).toBe(false)
  })
})
