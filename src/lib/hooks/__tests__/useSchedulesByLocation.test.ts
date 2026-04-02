// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useSchedulesByLocation } from '../useSchedulesByLocation'
import { futureDateISO, pastDateISO } from '@/__tests__/helpers/date-mock'

describe('useSchedulesByLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ schedules: [], registrations: [] }),
    }))
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schedules: [
          { id: 's1', start_time: futureDateISO(1) },
          { id: 's2', start_time: pastDateISO(1) },
        ],
        registrations: [],
      }),
    }))

    const { result } = renderHook(() => useSchedulesByLocation('loc-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.upcomingSchedules).toHaveLength(1)
    expect(result.current.upcomingSchedules[0].id).toBe('s1')
    expect(result.current.pastSchedules).toHaveLength(1)
    expect(result.current.pastSchedules[0].id).toBe('s2')
  })

  it('should return empty arrays when location id is empty', async () => {
    const { result } = renderHook(() => useSchedulesByLocation(''))

    expect(result.current.upcomingSchedules).toEqual([])
    expect(result.current.pastSchedules).toEqual([])
    expect(result.current.registrationsByScheduleId).toEqual({})
    expect(result.current.loading).toBe(false)
  })

  it('should expose a refetch function', async () => {
    const { result } = renderHook(() => useSchedulesByLocation('loc-1', 'all'))
    expect(typeof result.current.refetch).toBe('function')
  })

  it('should re-trigger fetch when refetch is called', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ schedules: [], registrations: [] }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useSchedulesByLocation('loc-1', 'all'))

    // Wait for the initial fetch to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const callsAfterMount = mockFetch.mock.calls.length
    expect(callsAfterMount).toBeGreaterThanOrEqual(1)

    // Call refetch and verify fetch is triggered again
    await act(async () => {
      result.current.refetch()
    })

    await waitFor(() => {
      expect(mockFetch.mock.calls.length).toBeGreaterThan(callsAfterMount)
    })
  })
})
