import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePaymentsByLocation } from '../usePaymentsByLocation'

globalThis.fetch = vi.fn()

describe('usePaymentsByLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty schedules when locationId is null', () => {
    const { result } = renderHook(() => usePaymentsByLocation(null, 'all'))

    expect(result.current.schedules).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should fetch schedules when locationId is provided', async () => {
    const mockSchedules = [
      {
        id: 'sch-1',
        start_time: '2026-04-15T10:00:00Z',
        end_time: '2026-04-15T12:00:00Z',
        location_id: 'loc-1',
        max_players: 12,
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
        locations: {
          id: 'loc-1',
          name: 'Sports Hall',
          address: '123 Main St',
          google_map_url: null,
        },
        totalCollected: 1000,
        pendingCount: 2,
      },
    ]

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSchedules,
    } as any)

    const { result } = renderHook(() => usePaymentsByLocation('loc-1', 'all'))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.schedules).toEqual(mockSchedules)
    expect(result.current.error).toBeNull()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/admin/payments/schedules?locationId=loc-1&dateRange=all'
    )
  })

  it('should update when dateRange changes', async () => {
    const mockSchedules: any[] = [
      {
        id: 'sch-1',
        start_time: '2026-04-15T10:00:00Z',
        end_time: '2026-04-15T12:00:00Z',
        location_id: 'loc-1',
        max_players: 12,
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
        locations: {
          id: 'loc-1',
          name: 'Sports Hall',
          address: '123 Main St',
          google_map_url: null,
        },
        totalCollected: 500,
        pendingCount: 1,
      },
    ]

    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockSchedules,
    } as any)

    const { result, rerender } = renderHook(
      ({ locationId, dateRange }) => usePaymentsByLocation(locationId, dateRange),
      {
        initialProps: { locationId: 'loc-1', dateRange: 'all' },
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    rerender({ locationId: 'loc-1', dateRange: 'last7' })

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenLastCalledWith(
        '/api/admin/payments/schedules?locationId=loc-1&dateRange=last7'
      )
    })
  })

  it('should handle fetch errors', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Not found' }),
    } as any)

    const { result } = renderHook(() => usePaymentsByLocation('loc-1', 'all'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).not.toBeNull()
    expect(result.current.schedules).toEqual([])
  })

  it('should support date range with specific date', async () => {
    const mockSchedules: Array<never> = []

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSchedules,
    } as any)

    renderHook(() => usePaymentsByLocation('loc-1', 'date:2026-04-15'))

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/admin/payments/schedules?locationId=loc-1&dateRange=date%3A2026-04-15'
      )
    })
  })
})
