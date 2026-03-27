// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { useHasAnimated } from '../useHasAnimated'

describe('useHasAnimated', () => {
  afterEach(() => {
    cleanup()
  })

  it('returns a ref object', () => {
    const { result } = renderHook(() => useHasAnimated())
    expect(result.current).toHaveProperty('current')
  })

  it('has current set to true after mount (useEffect has run)', () => {
    const { result } = renderHook(() => useHasAnimated())
    // After renderHook, useEffect has already fired
    expect(result.current.current).toBe(true)
  })

  it('preserves the same ref across re-renders', () => {
    const { result, rerender } = renderHook(() => useHasAnimated())
    const firstRef = result.current
    rerender()
    expect(result.current).toBe(firstRef)
  })

  it('remains true after re-renders', () => {
    const { result, rerender } = renderHook(() => useHasAnimated())
    expect(result.current.current).toBe(true)
    rerender()
    expect(result.current.current).toBe(true)
    rerender()
    expect(result.current.current).toBe(true)
  })
})
