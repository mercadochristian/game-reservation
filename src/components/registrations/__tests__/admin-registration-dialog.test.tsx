// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { AdminRegistrationDialog } from '../admin-registration-dialog'
import type { ScheduleWithSlots } from '@/types'

const mockSchedule: ScheduleWithSlots = {
  id: 'sch-123',
  start_time: new Date('2027-06-01T18:00:00').toISOString(),
  end_time: new Date('2027-06-01T20:00:00').toISOString(),
  location_id: 'loc-1',
  max_players: 12,
  num_teams: 2,
  required_levels: ['developmental'],
  status: 'open',
  position_prices: {},
  team_price: 20,
  created_by: 'user-1',
  registration_count: 0,
  deleted_at: null,
  discount_type: null,
  discount_value: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  locations: {
    id: 'loc-1',
    name: 'North Court',
    address: '123 Main St',
    google_map_url: null,
  },
}

describe('AdminRegistrationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    cleanup()
  })

  it('should render dialog with mode selector when open', () => {
    render(
      <AdminRegistrationDialog
        open={true}
        schedule={mockSchedule}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )
    expect(screen.getByText('Register Players')).toBeInTheDocument()
    expect(screen.getByText('Single')).toBeInTheDocument()
    expect(screen.getByText('Group')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(
      <AdminRegistrationDialog
        open={false}
        schedule={mockSchedule}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )
    expect(screen.queryByText('Register Players')).not.toBeInTheDocument()
  })

  it('should show player type selection buttons when dialog opens', () => {
    render(
      <AdminRegistrationDialog
        open={true}
        schedule={mockSchedule}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )
    expect(screen.getByText('Existing Player')).toBeInTheDocument()
    expect(screen.getByText('Guest Player')).toBeInTheDocument()
  })

  it('should show search input when Existing Player is selected', () => {
    render(
      <AdminRegistrationDialog
        open={true}
        schedule={mockSchedule}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Existing Player'))
    expect(screen.getByPlaceholderText('Search by name or email...')).toBeInTheDocument()
  })

  it('should show guest fields when Guest Player is selected', () => {
    render(
      <AdminRegistrationDialog
        open={true}
        schedule={mockSchedule}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Guest Player'))
    expect(screen.getByPlaceholderText('First name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
  })

  it('should call onSuccess and onClose after successful registration', async () => {
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    vi.useFakeTimers()

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'u1', first_name: 'John', last_name: 'Doe', email: 'j@test.com', skill_level: null }],
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ player_index: 0, success: true, user_id: 'u1' }] }),
      } as any)

    render(
      <AdminRegistrationDialog
        open={true}
        schedule={mockSchedule}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    )

    fireEvent.click(screen.getByText('Existing Player'))
    fireEvent.change(screen.getByPlaceholderText('Search by name or email...'), {
      target: { value: 'John' },
    })

    await vi.runAllTimersAsync()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/users/search?q=John'))
    })

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('John Doe'))

    const positionSelects = screen.getAllByRole('combobox')
    fireEvent.change(positionSelects[0], { target: { value: 'setter' } })

    vi.useRealTimers()

    fireEvent.click(screen.getByText('Register Players'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/register', expect.objectContaining({ method: 'POST' }))
      expect(onSuccess).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('should not call onSuccess when API returns error', async () => {
    const onSuccess = vi.fn()

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Registration failed' }),
    } as any)

    render(
      <AdminRegistrationDialog
        open={true}
        schedule={mockSchedule}
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />
    )

    fireEvent.click(screen.getByText('Guest Player'))
    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'Smith' } })
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'j@test.com' } })

    const [skillSelect] = screen.getAllByRole('combobox')
    fireEvent.change(skillSelect, { target: { value: 'intermediate' } })

    fireEvent.click(screen.getByText('Add Guest Player'))

    fireEvent.click(screen.getByText('Register Players'))

    await waitFor(() => {
      expect(onSuccess).not.toHaveBeenCalled()
    })
  })
})
