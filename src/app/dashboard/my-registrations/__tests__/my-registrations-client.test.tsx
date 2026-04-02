// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyRegistrationsClient } from '../my-registrations-client'
import * as supabaseClientModule from '@/lib/supabase/client'
import * as registrationsQueries from '@/lib/queries/registrations'
import { toast } from 'sonner'
import type { ScheduleWithLocation, Registration } from '@/types'

vi.mock('@/lib/supabase/client')
vi.mock('@/lib/queries/registrations')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockScheduleUpcoming: ScheduleWithLocation = {
  id: 'a0a0a0a1-a0a0-4a0a-8a0a-a0a0a0a0a0a1',
  location_id: 'a0a0a0a2-a0a0-4a0a-8a0a-a0a0a0a0a0a2',
  start_time: '2026-12-15T11:00:00Z',
  end_time: '2026-12-15T13:00:00Z',
  max_players: 12,
  num_teams: 2,
  required_levels: ['intermediate'],
  status: 'open',
  created_by: 'a0a0a0a3-a0a0-4a0a-8a0a-a0a0a0a0a0a3',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  position_prices: {},
  team_price: null,
  deleted_at: null,
  locations: {
    id: 'a0a0a0a2-a0a0-4a0a-8a0a-a0a0a0a0a0a2',
    name: 'Makati Sports Complex',
    address: 'Makati City',
    google_map_url: '',
  },
}

const mockSchedulePast: ScheduleWithLocation = {
  ...mockScheduleUpcoming,
  id: 'a0a0a0a4-a0a0-4a0a-8a0a-a0a0a0a0a0a4',
  start_time: '2026-01-01T11:00:00Z',
  end_time: '2026-01-01T13:00:00Z',
}

const mockRegistration: Registration = {
  id: 'a0a0a0a5-a0a0-4a0a-8a0a-a0a0a0a0a0a5',
  schedule_id: mockScheduleUpcoming.id,
  registered_by: 'a0a0a0a3-a0a0-4a0a-8a0a-a0a0a0a0a0a3',
  player_id: 'a0a0a0a3-a0a0-4a0a-8a0a-a0a0a0a0a0a3',
  team_preference: 'shuffle',
  attended: false,
  qr_token: 'qr-test-token',
  preferred_position: 'middle_blocker',
  lineup_team_id: null,
  registration_note: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function buildRow(schedule: ScheduleWithLocation, registration: Registration) {
  return {
    ...schedule,
    locations: schedule.locations,
    registrations: [registration],
  }
}

function setupAuthenticatedClient(userId = 'a0a0a0a3-a0a0-4a0a-8a0a-a0a0a0a0a0a3') {
  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  }
  vi.mocked(supabaseClientModule.createClient).mockReturnValue(mockClient as any)
  return mockClient
}

function setupUnauthenticatedClient() {
  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
  }
  vi.mocked(supabaseClientModule.createClient).mockReturnValue(mockClient as any)
}

beforeEach(() => {
  cleanup()
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('MyRegistrationsClient', () => {
  describe('unauthenticated state', () => {
    it('shows loading state initially then resolves to no content when unauthenticated', async () => {
      setupUnauthenticatedClient()
      vi.mocked(registrationsQueries.getPlayerRegistrations).mockResolvedValue({
        data: [],
        error: null,
      } as any)

      render(<MyRegistrationsClient />)

      await waitFor(() => {
        expect(screen.queryByText('Loading your registrations...')).not.toBeInTheDocument()
      })
    })
  })

  describe('authenticated with upcoming games', () => {
    it('renders upcoming games heading after load', async () => {
      setupAuthenticatedClient()
      vi.mocked(registrationsQueries.getPlayerRegistrations).mockResolvedValue({
        data: [buildRow(mockScheduleUpcoming, mockRegistration)],
        error: null,
      } as any)

      render(<MyRegistrationsClient />)

      await waitFor(() => {
        expect(screen.getByText('Upcoming Games')).toBeInTheDocument()
      })
    })

    it('renders a game card for each upcoming registration', async () => {
      setupAuthenticatedClient()
      vi.mocked(registrationsQueries.getPlayerRegistrations).mockResolvedValue({
        data: [buildRow(mockScheduleUpcoming, mockRegistration)],
        error: null,
      } as any)

      render(<MyRegistrationsClient />)

      await waitFor(() => {
        expect(screen.getAllByTestId('registered-game-card')).toHaveLength(1)
      })
    })

    it('renders empty state when there are no upcoming registrations', async () => {
      setupAuthenticatedClient()
      vi.mocked(registrationsQueries.getPlayerRegistrations).mockResolvedValue({
        data: [],
        error: null,
      } as any)

      render(<MyRegistrationsClient />)

      await waitFor(() => {
        expect(screen.getByText('No upcoming games.')).toBeInTheDocument()
      })
    })

    it('shows toast error when getPlayerRegistrations fails', async () => {
      setupAuthenticatedClient()
      vi.mocked(registrationsQueries.getPlayerRegistrations).mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      } as any)

      render(<MyRegistrationsClient />)

      await waitFor(() => {
        expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Failed to load your registrations')
      })
    })
  })

  describe('toggle to past games', () => {
    it('renders Past Games heading after clicking Past Games button', async () => {
      const user = userEvent.setup()
      setupAuthenticatedClient()

      // First call = upcoming (initial load), second call = past (after toggle)
      vi.mocked(registrationsQueries.getPlayerRegistrations)
        .mockResolvedValueOnce({ data: [], error: null } as any)
        .mockResolvedValueOnce({
          data: [buildRow(mockSchedulePast, { ...mockRegistration, schedule_id: mockSchedulePast.id })],
          error: null,
        } as any)

      render(<MyRegistrationsClient />)

      await waitFor(() => {
        expect(screen.getByText('Upcoming Games')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Past Games' }))

      await waitFor(() => {
        expect(screen.getByText('Past Games')).toBeInTheDocument()
      })
    })

    it('renders past game cards after toggling to past view', async () => {
      const user = userEvent.setup()
      setupAuthenticatedClient()

      vi.mocked(registrationsQueries.getPlayerRegistrations)
        .mockResolvedValueOnce({ data: [], error: null } as any)
        .mockResolvedValueOnce({
          data: [buildRow(mockSchedulePast, { ...mockRegistration, schedule_id: mockSchedulePast.id })],
          error: null,
        } as any)

      render(<MyRegistrationsClient />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Past Games' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Past Games' }))

      await waitFor(() => {
        expect(screen.getAllByTestId('registered-game-card')).toHaveLength(1)
      })
    })

    it('shows empty state when there are no past games', async () => {
      const user = userEvent.setup()
      setupAuthenticatedClient()

      vi.mocked(registrationsQueries.getPlayerRegistrations)
        .mockResolvedValueOnce({ data: [], error: null } as any)
        .mockResolvedValueOnce({ data: [], error: null } as any)

      render(<MyRegistrationsClient />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Past Games' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Past Games' }))

      await waitFor(() => {
        expect(screen.getByText('No past games.')).toBeInTheDocument()
      })
    })

    it('shows toast error when fetching past games fails', async () => {
      const user = userEvent.setup()
      setupAuthenticatedClient()

      vi.mocked(registrationsQueries.getPlayerRegistrations)
        .mockResolvedValueOnce({ data: [], error: null } as any)
        .mockResolvedValueOnce({ data: null, error: { message: 'DB error' } } as any)

      render(<MyRegistrationsClient />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Past Games' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Past Games' }))

      await waitFor(() => {
        expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Failed to load past games')
      })
    })
  })

  describe('load more pagination', () => {
    it('shows Load More button when a full page is returned', async () => {
      setupAuthenticatedClient()

      // Return exactly PAGE_SIZE (20) items to trigger "has more"
      const fullPage = Array.from({ length: 20 }, (_, i) => buildRow(
        { ...mockScheduleUpcoming, id: `a0a0a0a${i.toString(16).padStart(1, '0')}-a0a0-4a0a-8a0a-a0a0a0a0a0${i.toString(16).padStart(2, '0')}` },
        { ...mockRegistration, id: `b0b0b0b${i.toString(16).padStart(1, '0')}-b0b0-4b0b-8b0b-b0b0b0b0b0${i.toString(16).padStart(2, '0')}` },
      ))

      vi.mocked(registrationsQueries.getPlayerRegistrations).mockResolvedValue({
        data: fullPage,
        error: null,
      } as any)

      render(<MyRegistrationsClient />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Load More' })).toBeInTheDocument()
      })
    })

    it('does not show Load More button when fewer than PAGE_SIZE items are returned', async () => {
      setupAuthenticatedClient()

      vi.mocked(registrationsQueries.getPlayerRegistrations).mockResolvedValue({
        data: [buildRow(mockScheduleUpcoming, mockRegistration)],
        error: null,
      } as any)

      render(<MyRegistrationsClient />)

      await waitFor(() => {
        expect(screen.getAllByTestId('registered-game-card')).toHaveLength(1)
      })

      expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument()
    })
  })

  describe('QR modal', () => {
    it('opens QR modal when Show QR button is clicked', async () => {
      const user = userEvent.setup()
      setupAuthenticatedClient()

      vi.mocked(registrationsQueries.getPlayerRegistrations).mockResolvedValue({
        data: [buildRow(mockScheduleUpcoming, mockRegistration)],
        error: null,
      } as any)

      render(<MyRegistrationsClient />)

      await waitFor(() => {
        expect(screen.getAllByTestId('registered-game-card')).toHaveLength(1)
      })

      const showQRButton = screen.getByRole('button', { name: /Show QR/i })
      await user.click(showQRButton)

      await waitFor(() => {
        expect(screen.getByText(/December 15, 2026/i)).toBeInTheDocument()
      })
    })
  })

  describe('uses getPlayerRegistrations query function', () => {
    it('calls getPlayerRegistrations with correct arguments for upcoming', async () => {
      const userId = 'a0a0a0a3-a0a0-4a0a-8a0a-a0a0a0a0a0a3'
      setupAuthenticatedClient(userId)

      vi.mocked(registrationsQueries.getPlayerRegistrations).mockResolvedValue({
        data: [],
        error: null,
      } as any)

      render(<MyRegistrationsClient />)

      await waitFor(() => {
        expect(registrationsQueries.getPlayerRegistrations).toHaveBeenCalledWith(
          expect.anything(),
          userId,
          'upcoming',
          0,
          20,
        )
      })
    })
  })
})
