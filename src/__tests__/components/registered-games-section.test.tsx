// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { RegisteredGamesSection } from '@/components/registered-games-section'
import * as supabaseModule from '@/lib/supabase/client'

// Mock Supabase client
vi.mock('@/lib/supabase/client')

describe('RegisteredGamesSection', () => {
  const mockSchedule = {
    id: 'sched-1',
    status: 'open',
    start_time: '2026-04-15T19:00:00Z',
    end_time: '2026-04-15T21:00:00Z',
    max_players: 12,
    num_teams: 2,
    required_levels: [],
    price: 500,
    description: null,
    created_at: '2026-03-29',
    discount_type: null,
    discount_value: null,
    locations: {
      id: 'loc-1',
      name: 'Test Location',
      address: 'Test Address',
      google_map_url: '',
    },
  }

  const mockRegistration = {
    id: 'reg-1',
    schedule_id: 'sched-1',
    player_id: 'user-1',
    preferred_position: 'middle',
    qr_token: 'test-token',
    status: 'registered',
    created_at: '2026-03-28',
  }

  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders empty state when user is not authenticated', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    render(<RegisteredGamesSection />)

    await waitFor(() => {
      expect(screen.queryByText(/Your Registered Games/i)).not.toBeInTheDocument()
    })
  })

  it('renders section heading when user is authenticated', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }),
      removeChannel: vi.fn().mockResolvedValue({}),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    render(<RegisteredGamesSection />)

    await waitFor(() => {
      expect(screen.getByText('Your Registered Games')).toBeInTheDocument()
    })
  })

  it('renders game cards for registered schedules', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ ...mockRegistration, schedules: mockSchedule }],
            error: null,
          }),
        }),
      }),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }),
      removeChannel: vi.fn().mockResolvedValue({}),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    render(<RegisteredGamesSection />)

    await waitFor(() => {
      expect(screen.getByText('Test Location')).toBeInTheDocument()
    })
  })

  it('filters out past games when includePastGames is false', async () => {
    const pastSchedule = { ...mockSchedule, start_time: '2026-01-15T19:00:00Z' }
    const futureSchedule = { ...mockSchedule, id: 'sched-2', start_time: '2026-04-15T19:00:00Z' }

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { ...mockRegistration, schedule_id: 'sched-1', schedules: pastSchedule },
              { ...mockRegistration, id: 'reg-2', schedule_id: 'sched-2', schedules: futureSchedule },
            ],
            error: null,
          }),
        }),
      }),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }),
      removeChannel: vi.fn().mockResolvedValue({}),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    render(<RegisteredGamesSection includePastGames={false} />)

    await waitFor(() => {
      // Should only render the future game
      const cards = screen.getAllByText(/Test Location/)
      expect(cards).toHaveLength(1)
    })
  })

  it('includes past games when includePastGames is true', async () => {
    const pastSchedule = { ...mockSchedule, start_time: '2026-01-15T19:00:00Z' }
    const futureSchedule = { ...mockSchedule, id: 'sched-2', start_time: '2026-04-15T19:00:00Z' }

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { ...mockRegistration, schedule_id: 'sched-1', schedules: pastSchedule },
              { ...mockRegistration, id: 'reg-2', schedule_id: 'sched-2', schedules: futureSchedule },
            ],
            error: null,
          }),
        }),
      }),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }),
      removeChannel: vi.fn().mockResolvedValue({}),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    render(<RegisteredGamesSection includePastGames={true} />)

    await waitFor(() => {
      // Should render both games
      const cards = screen.getAllByText(/Test Location/)
      expect(cards).toHaveLength(2)
    })
  })

  it('renders empty state when user has no registrations', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }),
      removeChannel: vi.fn().mockResolvedValue({}),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    render(<RegisteredGamesSection includePastGames={false} />)

    await waitFor(() => {
      expect(screen.getByText(/haven't registered for any games/i)).toBeInTheDocument()
    })
  })
})
