import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSchedulePlayers } from '../useSchedulePlayers'

// Mock fetch globally
global.fetch = vi.fn()

describe('useSchedulePlayers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty arrays when scheduleId is null', () => {
    const { result } = renderHook(() => useSchedulePlayers(null))

    expect(result.current.attended).toEqual([])
    expect(result.current.pending).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('fetches players when scheduleId is provided', async () => {
    const mockResponse = {
      attended: [
        {
          registration_id: 'reg-1',
          player: { id: 'player-1', first_name: 'Jane', last_name: 'Doe' },
          payment_status: 'paid',
        },
      ],
      pending: [
        {
          registration_id: 'reg-2',
          player: { id: 'player-2', first_name: 'John', last_name: 'Smith' },
          payment_status: 'pending',
        },
      ],
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const { result } = renderHook(() => useSchedulePlayers('sched-123'))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.attended).toHaveLength(1)
    expect(result.current.pending).toHaveLength(1)
    expect(result.current.attended[0].player.first_name).toBe('Jane')
    expect(result.current.pending[0].player.first_name).toBe('John')
  })

  it('handles fetch errors gracefully', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    })

    const { result } = renderHook(() => useSchedulePlayers('sched-123'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Server error')
    expect(result.current.attended).toEqual([])
    expect(result.current.pending).toEqual([])
  })

  it('clears data when scheduleId changes from valid to null', async () => {
    const mockResponse = {
      attended: [
        {
          registration_id: 'reg-1',
          player: { id: 'player-1', first_name: 'Jane', last_name: 'Doe' },
          payment_status: 'paid',
        },
      ],
      pending: [],
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const { result, rerender } = renderHook(
      ({ scheduleId }: { scheduleId: string | null }) => useSchedulePlayers(scheduleId),
      { initialProps: { scheduleId: 'sched-123' } }
    )

    await waitFor(() => {
      expect(result.current.attended).toHaveLength(1)
    })

    rerender({ scheduleId: null })

    expect(result.current.attended).toEqual([])
    expect(result.current.pending).toEqual([])
  })
})
