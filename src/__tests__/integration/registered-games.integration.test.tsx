// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisteredGamesSection } from '@/components/registered-games-section'
import { RegisteredGameCard } from '@/components/registered-game-card'
import { QRModal } from '@/components/qr-modal'
import * as supabaseModule from '@/lib/supabase/client'
import type { ScheduleWithLocation, Registration } from '@/types'

// Mock Supabase client
vi.mock('@/lib/supabase/client')

describe('Registered Games Integration', () => {
  const mockSchedule: ScheduleWithLocation = {
    id: 'schedule-1',
    title: 'Thursday Volleyball Game',
    location_id: 'loc-1',
    start_time: '2026-04-15T11:00:00Z',
    end_time: '2026-04-15T13:00:00Z',
    max_players: 12,
    num_teams: 2,
    required_levels: ['developmental', 'intermediate'],
    status: 'open',
    created_by: 'user-1',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    position_prices: {},
    team_price: null,
    locations: {
      id: 'loc-1',
      name: 'Makati Sports Complex',
      address: 'Makati City, Philippines',
      google_map_url: 'https://maps.google.com',
    },
  }

  const mockRegistration: Registration = {
    id: 'reg-1',
    schedule_id: 'schedule-1',
    registered_by: 'user-2',
    player_id: 'user-1',
    team_preference: 'shuffle',
    attended: false,
    qr_token: 'qr-token-12345',
    preferred_position: 'middle_blocker',
    lineup_team_id: null,
    created_at: '2026-03-15T00:00:00Z',
    updated_at: '2026-03-15T00:00:00Z',
  }

  const pastSchedule: ScheduleWithLocation = {
    ...mockSchedule,
    id: 'schedule-2',
    start_time: '2026-01-15T11:00:00Z',
    end_time: '2026-01-15T13:00:00Z',
  }

  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  // Test 1: RegisteredGamesSection displays on home page for authenticated users
  it('displays RegisteredGamesSection on home page for authenticated users', async () => {
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

    // Verify section heading appears
    await waitFor(() => {
      expect(screen.getByText('Your Registered Games')).toBeInTheDocument()
    })

    // Verify location appears in game card
    expect(screen.getByText('Makati Sports Complex')).toBeInTheDocument()
  })

  // Test 2: RegisteredGamesSection shows QR button and opens modal with schedule details
  it('opens QR modal with schedule details when user clicks Show QR button', async () => {
    const user = userEvent.setup()
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
      expect(screen.getByText('Your Registered Games')).toBeInTheDocument()
    })

    // Find and click the Show QR button
    const showQRButton = screen.getByRole('button', { name: /Show QR/i })
    await user.click(showQRButton)

    // Verify QR modal is opened with schedule details (check for date text)
    await waitFor(() => {
      // The modal displays the date of the schedule
      expect(screen.getByText(/Wednesday, April 15, 2026/)).toBeInTheDocument()
    })
  })

  // Test 3: Registered game card displays all expected information
  it('registered game card displays location, date, time, and position', async () => {
    const onShowQR = vi.fn()
    render(
      <RegisteredGameCard
        schedule={mockSchedule}
        registration={mockRegistration}
        onShowQR={onShowQR}
      />
    )

    // Verify location appears
    expect(screen.getByText('Makati Sports Complex')).toBeInTheDocument()

    // Verify address appears
    expect(screen.getByText('Makati City, Philippines')).toBeInTheDocument()

    // Verify position appears
    expect(screen.getByText('Middle Blocker')).toBeInTheDocument()

    // Verify Show QR button exists
    expect(screen.getByRole('button', { name: /Show QR/i })).toBeInTheDocument()
  })

  // Test 4: RegisteredGamesSection filters out past games by default
  it('filters out past games by default (includePastGames=false)', async () => {
    // Create a future schedule with time way in the future
    const futureSchedule: ScheduleWithLocation = {
      ...mockSchedule,
      id: 'schedule-4',
      start_time: '2026-12-15T11:00:00Z',
      end_time: '2026-12-15T13:00:00Z',
    }

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
              { ...mockRegistration, schedule_id: 'schedule-1', schedules: pastSchedule },
              { ...mockRegistration, id: 'reg-2', schedule_id: 'schedule-4', schedules: futureSchedule },
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
      expect(screen.getByText('Your Registered Games')).toBeInTheDocument()
    })

    // Wait for cards to render with animations
    await waitFor(() => {
      const locationCards = screen.getAllByText(/Makati Sports Complex/)
      expect(locationCards).toHaveLength(1)
    })
  })

  // Test 5: RegisteredGamesSection includes past games when flag is true
  it('includes past games when includePastGames=true', async () => {
    // Create a future schedule
    const futureSchedule: ScheduleWithLocation = {
      ...mockSchedule,
      id: 'schedule-5',
      start_time: '2026-12-15T11:00:00Z',
      end_time: '2026-12-15T13:00:00Z',
    }

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
              { ...mockRegistration, schedule_id: 'schedule-2', schedules: pastSchedule },
              { ...mockRegistration, id: 'reg-2', schedule_id: 'schedule-5', schedules: futureSchedule },
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
      expect(screen.getByText('Your Registered Games')).toBeInTheDocument()
    })

    // Should display both future and past games (two location cards)
    const locationCards = screen.getAllByText(/Makati Sports Complex/)
    expect(locationCards).toHaveLength(2)
  })

  // Test 6: Authenticated user with no registrations sees empty state
  it('shows empty state when user has no registrations', async () => {
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
      expect(screen.getByText(/haven't registered for any games/i)).toBeInTheDocument()
    })
  })

  // Test 7: Unauthenticated user does not see RegisteredGamesSection
  it('does not render for unauthenticated users', async () => {
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
      expect(screen.queryByText('Your Registered Games')).not.toBeInTheDocument()
    })
  })

  // Test 8: QR modal displays schedule details in modal
  it('displays schedule details and position in QR modal', () => {
    const mockOnOpenChange = vi.fn()

    render(
      <QRModal open={true} onOpenChange={mockOnOpenChange} schedule={mockSchedule} registration={mockRegistration} />
    )

    // Verify QR modal is open with date details
    expect(screen.getByText(/Wednesday, April 15, 2026/)).toBeInTheDocument()

    // Verify position is shown
    expect(screen.getByText('Your Position')).toBeInTheDocument()
    expect(screen.getByText('Middle Blocker')).toBeInTheDocument()

    // Verify location is shown
    expect(screen.getByText(/Location/)).toBeInTheDocument()
  })

  // Test 9: Multiple games display in grid layout
  it('displays multiple registered games in a grid', async () => {
    const mockSchedule2: ScheduleWithLocation = {
      ...mockSchedule,
      id: 'schedule-3',
      title: 'Friday Volleyball Game',
      start_time: '2026-04-16T11:00:00Z',
      end_time: '2026-04-16T13:00:00Z',
    }

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
              { ...mockRegistration, schedule_id: 'schedule-1', schedules: mockSchedule },
              { ...mockRegistration, id: 'reg-2', schedule_id: 'schedule-3', schedules: mockSchedule2 },
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

    render(<RegisteredGamesSection />)

    await waitFor(() => {
      expect(screen.getByText('Your Registered Games')).toBeInTheDocument()
    })

    // Wait for cards to render (Framer Motion animations take time)
    await waitFor(() => {
      const cards = screen.getAllByTestId('registered-game-card')
      expect(cards).toHaveLength(2)
    })
  })

  // Test 10: Show QR button callback is triggered with correct data
  it('calls onShowQR callback with correct schedule and registration data', async () => {
    const user = userEvent.setup()
    const onShowQR = vi.fn()

    render(
      <RegisteredGameCard
        schedule={mockSchedule}
        registration={mockRegistration}
        onShowQR={onShowQR}
      />
    )

    const showQRButton = screen.getByRole('button', { name: /Show QR/i })
    await user.click(showQRButton)

    expect(onShowQR).toHaveBeenCalledOnce()
    expect(onShowQR).toHaveBeenCalledWith(mockSchedule, mockRegistration)
  })
})
