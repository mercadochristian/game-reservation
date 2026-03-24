// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSupabaseQuery } from '../useSupabaseQuery'

vi.mock('sonner')

describe('useSupabaseQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has initial state: null data, null error, false isLoading', () => {
    const { result } = renderHook(() => useSupabaseQuery({ context: 'test' }))

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('sets isLoading to true during execute', async () => {
    const { result } = renderHook(() => useSupabaseQuery({ context: 'test' }))

    let resolveQuery: ((value: any) => void) | null = null

    act(() => {
      result.current.execute(
        () =>
          new Promise((resolve) => {
            resolveQuery = resolve
          })
      )
    })

    // Immediately after calling execute, isLoading should be true
    expect(result.current.isLoading).toBe(true)

    // Complete the query
    act(() => {
      resolveQuery!({ data: 'test', error: null })
    })

    // Wait for state to settle
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('sets data and clears error on successful query', async () => {
    const { result } = renderHook(() => useSupabaseQuery<string>({ context: 'test' }))

    await act(async () => {
      await result.current.execute(() => Promise.resolve({ data: 'success', error: null }))
    })

    expect(result.current.data).toBe('success')
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('sets error and clears data on failed query', async () => {
    const { result } = renderHook(() => useSupabaseQuery<string>({ context: 'test query' }))
    const { toast } = await import('sonner')

    await act(async () => {
      await result.current.execute(() =>
        Promise.resolve({ data: null, error: { message: 'Test error' } })
      )
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeDefined()
    expect(result.current.isLoading).toBe(false)
    expect(toast.error).toHaveBeenCalled()
  })

  it('does not show toast when showToast is false', async () => {
    const { result } = renderHook(() =>
      useSupabaseQuery<string>({ context: 'test', showToast: false })
    )
    const { toast } = await import('sonner')

    await act(async () => {
      await result.current.execute(() =>
        Promise.resolve({ data: null, error: { message: 'Test error' } })
      )
    })

    expect(result.current.error).toBeDefined()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('handles exception thrown in queryFn', async () => {
    const { result } = renderHook(() => useSupabaseQuery<string>({ context: 'test' }))
    const { toast } = await import('sonner')

    await act(async () => {
      await result.current.execute(() => Promise.reject(new Error('Unexpected error')))
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.data).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(toast.error).toHaveBeenCalled()
  })

  it('prevents stale updates via executionId guard', async () => {
    const { result } = renderHook(() => useSupabaseQuery<string>({ context: 'test' }))

    let firstResolve: ((value: any) => void) | null = null
    let secondResolve: ((value: any) => void) | null = null

    // Start first execute (slow) - don't await
    act(() => {
      result.current.execute(
        () =>
          new Promise((resolve) => {
            firstResolve = resolve
          })
      )
    })

    // Start second execute (fast) - don't await
    act(() => {
      result.current.execute(
        () =>
          new Promise((resolve) => {
            secondResolve = resolve
          })
      )
    })

    // Second completes first with "second result"
    await act(async () => {
      secondResolve!({ data: 'second result', error: null })
    })

    await waitFor(() => {
      expect(result.current.data).toBe('second result')
    })

    // First tries to resolve with "first result" (should be ignored)
    await act(async () => {
      firstResolve!({ data: 'first result', error: null })
    })

    // Data should still be "second result" because first was stale
    expect(result.current.data).toBe('second result')
  })
})
