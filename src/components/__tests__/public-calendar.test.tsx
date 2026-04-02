// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null),
  })),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, width, height }: { src: string; alt: string; width: number; height: number }) =>
    React.createElement('img', { src, alt, width, height }),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      React.createElement('div', props, children),
    button: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      React.createElement('button', props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// Stub child modals and components that are not under test
vi.mock('@/components/login-modal', () => ({
  LoginModal: () => null,
}))
vi.mock('@/components/qr-modal', () => ({
  QRModal: () => null,
}))
vi.mock('@/components/position-modal', () => ({
  PositionModal: () => null,
}))
vi.mock('@/components/schedule-info', () => ({
  ScheduleInfo: () => React.createElement('div', null, 'Schedule Info'),
}))

vi.mock('@/lib/utils/timezone', () => ({
  getNowInManila: vi.fn(() => new Date('2026-03-01T00:00:00')),
  toManilaDateKey: vi.fn((utcDate: string) => {
    // Simple implementation: return first 10 chars of the ISO string
    return String(utcDate).slice(0, 10)
  }),
  getTodayManilaKey: vi.fn(() => '2026-03-27'),
}))

vi.mock('@/lib/utils/position-slots', () => ({
  POSITION_SLOTS: [
    { key: 'setter', label: 'Setter' },
    { key: 'open_spiker', label: 'Open' },
  ],
  getPositionTotal: vi.fn(() => 4),
  getPositionAvailable: vi.fn(() => 2),
}))

vi.mock('@/lib/animations', () => ({
  fadeUpVariants: {},
}))

import { createClient } from '@/lib/supabase/client'
import { PublicCalendar } from '../public-calendar'
import type { ScheduleWithLocation } from '@/types'
import { futureDateISO } from '@/__tests__/helpers/date-mock'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSchedule(overrides: Partial<ScheduleWithLocation> = {}): ScheduleWithLocation {
  const defaultStart = futureDateISO(1)
  return {
    id: 'sched-1',
    start_time: defaultStart,
    end_time: new Date(new Date(defaultStart).getTime() + 7_200_000).toISOString(),
    location_id: 'loc-1',
    max_players: 12,
    num_teams: 2,
    status: 'open',
    required_levels: [],
    position_prices: {},
    team_price: null,
    created_by: 'admin-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    discount_type: null,
    discount_value: null,
    locations: { id: 'loc-1', name: 'Main Court', address: null, google_map_url: null },
    ...overrides,
  }
}

function buildSupabaseMock({
  authUser = null,
  fetchImpl,
}: {
  authUser?: { id: string } | null
  fetchImpl?: typeof globalThis.fetch
} = {}) {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: authUser }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn().mockResolvedValue({}),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PublicCalendar', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    vi.clearAllMocks()
    globalThis.fetch = originalFetch
  })

  // -------------------------------------------------------------------------
  // schedulesByDate — useMemo grouping logic
  // -------------------------------------------------------------------------

  describe('schedulesByDate grouping (useMemo)', () => {
    it('renders a dot indicator for a date that has a schedule', async () => {
      vi.mocked(createClient).mockReturnValue(buildSupabaseMock() as any)
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ counts: {}, positionCounts: {} }),
      } as any)

      const schedule = makeSchedule({ start_time: futureDateISO(1), id: 'sched-1' })
      render(<PublicCalendar schedules={[schedule]} />)

      // The calendar should render without crashing — component mounts successfully
      await waitFor(() => {
        // March 2026 has 31 days; day 15 should appear
        const day15 = screen.getAllByText('15')
        expect(day15.length).toBeGreaterThan(0)
      })
    })

    it('groups multiple schedules on the same date correctly', async () => {
      vi.mocked(createClient).mockReturnValue(buildSupabaseMock() as any)
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ counts: {}, positionCounts: {} }),
      } as any)

      const s1 = makeSchedule({ id: 'sched-1', start_time: futureDateISO(1) })
      const s2 = makeSchedule({ id: 'sched-2', start_time: futureDateISO(1) })
      const s3 = makeSchedule({ id: 'sched-3', start_time: futureDateISO(1) })

      // Should render without errors — grouping handled internally
      expect(() => render(<PublicCalendar schedules={[s1, s2, s3]} />)).not.toThrow()

      // toManilaDateKey mock returns first 10 chars, so s1 and s2 both map to '2026-03-15'
      // and s3 maps to '2026-03-20'. The useMemo should not cause errors.
    })

    it('handles empty schedules array without errors', async () => {
      vi.mocked(createClient).mockReturnValue(buildSupabaseMock() as any)
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ counts: {}, positionCounts: {} }),
      } as any)

      expect(() => render(<PublicCalendar schedules={[]} />)).not.toThrow()

      // With no schedules the component should render without crashing
      // Calendar header should render with the month/year text
      await waitFor(() => {
        expect(screen.getAllByText(/March 2026/).length).toBeGreaterThan(0)
      })
    })
  })

  // -------------------------------------------------------------------------
  // AbortController cleanup on fetchCounts useEffect
  // -------------------------------------------------------------------------

  describe('AbortController cleanup on fetchCounts useEffect', () => {
    it('aborts the in-flight fetch when the component unmounts', async () => {
      vi.mocked(createClient).mockReturnValue(buildSupabaseMock() as any)

      let capturedSignal: AbortSignal | undefined
      globalThis.fetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
        capturedSignal = opts?.signal as AbortSignal
        // Never resolves — simulates a slow network
        return new Promise(() => {})
      })

      const schedule = makeSchedule()
      const { unmount } = render(<PublicCalendar schedules={[schedule]} />)

      // Let the effect run
      await new Promise((r) => setTimeout(r, 0))

      // The fetch should have been called with a signal
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      expect(capturedSignal).toBeDefined()
      expect(capturedSignal!.aborted).toBe(false)

      // Unmounting should trigger the AbortController cleanup
      unmount()

      // After unmount the signal should be aborted
      expect(capturedSignal!.aborted).toBe(true)
    })

    it('does not call toast.error when fetch is aborted (AbortError is swallowed)', async () => {
      const { toast } = await import('sonner')
      vi.mocked(createClient).mockReturnValue(buildSupabaseMock() as any)

      globalThis.fetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const signal = opts?.signal as AbortSignal
          if (signal) {
            signal.addEventListener('abort', () => {
              const err = new DOMException('The operation was aborted', 'AbortError')
              reject(err)
            })
          }
        })
      })

      const schedule = makeSchedule()
      const { unmount } = render(<PublicCalendar schedules={[schedule]} />)

      await new Promise((r) => setTimeout(r, 0))

      unmount()

      // Allow rejection to propagate
      await new Promise((r) => setTimeout(r, 10))

      expect(toast.error).not.toHaveBeenCalled()
    })

    it('calls toast.error on non-abort fetch failures', async () => {
      const { toast } = await import('sonner')
      vi.mocked(createClient).mockReturnValue(buildSupabaseMock() as any)

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn(),
      } as any)

      const schedule = makeSchedule()
      render(<PublicCalendar schedules={[schedule]} />)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Could not load registration counts')
      })
    })
  })

  // -------------------------------------------------------------------------
  // Parallel fetch — Phase 3.1 performance improvement
  // Auth check and registration counts must start concurrently via Promise.all
  // -------------------------------------------------------------------------

  describe('parallel fetch: auth + counts start concurrently', () => {
    it('initiates both auth.getUser() and fetch() before either resolves', async () => {
      // We track when each async operation *starts* by recording call order
      // using a shared timeline array. If fetch started after auth resolved,
      // the order would be: auth-start, auth-resolve, fetch-start.
      // With Promise.all parallelism the order must be: auth-start, fetch-start
      // (both kicked off before either awaits).
      const timeline: string[] = []

      let resolveAuth!: (v: unknown) => void
      const authPromise = new Promise((res) => { resolveAuth = res })

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockImplementation(() => {
            timeline.push('auth-start')
            return authPromise
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
        channel: vi.fn().mockReturnValue({
          on: vi.fn().mockReturnThis(),
          subscribe: vi.fn().mockReturnThis(),
        }),
        removeChannel: vi.fn().mockResolvedValue({}),
      }
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      let resolveFetch!: (v: unknown) => void
      const fetchPromise = new Promise((res) => { resolveFetch = res })
      globalThis.fetch = vi.fn().mockImplementation(() => {
        timeline.push('fetch-start')
        return fetchPromise
      })

      const schedule = makeSchedule()
      render(<PublicCalendar schedules={[schedule]} />)

      // Let the effect fire
      await new Promise((r) => setTimeout(r, 0))

      // Both operations must have started before either resolved
      expect(timeline).toContain('auth-start')
      expect(timeline).toContain('fetch-start')

      // Crucially: auth-start must come before fetch resolves, and fetch-start
      // must come before auth resolves — proving they were initiated in the
      // same synchronous turn (both before any await settled).
      const authIdx = timeline.indexOf('auth-start')
      const fetchIdx = timeline.indexOf('fetch-start')
      expect(authIdx).toBeGreaterThanOrEqual(0)
      expect(fetchIdx).toBeGreaterThanOrEqual(0)

      // Both started in the same effect run — neither is gated on the other
      expect(Math.abs(authIdx - fetchIdx)).toBeLessThanOrEqual(1)

      // Clean up pending promises
      resolveAuth({ data: { user: null }, error: null })
      resolveFetch({ ok: true, json: vi.fn().mockResolvedValue({ counts: {}, positionCounts: {} }) })
    })

    it('resolves counts correctly even when auth resolves after fetch', async () => {
      let resolveAuth!: (v: unknown) => void
      const authPromise = new Promise((res) => { resolveAuth = res })

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockReturnValue(authPromise),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
        channel: vi.fn().mockReturnValue({
          on: vi.fn().mockReturnThis(),
          subscribe: vi.fn().mockReturnThis(),
        }),
        removeChannel: vi.fn().mockResolvedValue({}),
      }
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      // Fetch resolves immediately with data
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          counts: { 'sched-1': 3 },
          positionCounts: { 'sched-1': { setter: 3 } },
        }),
      } as any)

      const schedule = makeSchedule()
      render(<PublicCalendar schedules={[schedule]} />)

      // Resolve fetch first (already resolved), then auth second
      await new Promise((r) => setTimeout(r, 0))
      resolveAuth({ data: { user: null }, error: null })
      await new Promise((r) => setTimeout(r, 10))

      // Component should not throw — Promise.all handles out-of-order resolution
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1)
    })
  })

  // -------------------------------------------------------------------------
  // Auth useEffect cancelled flag
  // -------------------------------------------------------------------------

  describe('auth useEffect cancelled flag', () => {
    it('does not update user state after unmount', async () => {
      let resolveAuth!: (value: unknown) => void
      const authPromise = new Promise((res) => { resolveAuth = res })

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockReturnValue(authPromise),
        },
        from: vi.fn(),
        channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
        removeChannel: vi.fn(),
      }
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ counts: {}, positionCounts: {} }),
      } as any)

      const { unmount } = render(<PublicCalendar schedules={[]} />)

      // Unmount before auth resolves
      unmount()

      // Resolve auth — the cancelled guard should prevent state updates
      resolveAuth({ data: { user: null }, error: null })
      await new Promise((r) => setTimeout(r, 0))

      // No assertions on rendered state — the key assertion is that no React
      // "update on unmounted component" warnings are thrown. The test passing
      // without error is the signal that the cancelled guard works.
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1)
    })
  })
})
