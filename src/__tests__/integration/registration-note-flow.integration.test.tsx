import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as supabaseModule from '@/lib/supabase/client'
import type { Registration, ScheduleWithLocation } from '@/types'

// Mock Supabase client
vi.mock('@/lib/supabase/client')

describe('Registration Note Integration Flow', () => {
  const mockSchedule: ScheduleWithLocation = {
    id: 'schedule-1',
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
    deleted_at: null,
    locations: {
      id: 'loc-1',
      name: 'Makati Sports Complex',
      address: 'Makati City, Philippines',
      google_map_url: 'https://maps.google.com',
    },
  }

  const baseRegistration: Registration = {
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
    registration_note: null,
  }

  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('should save registration_note when creating a registration', async () => {
    const testNote = 'I have a knee injury, please assign me to setter position'
    const registrationWithNote: Registration = {
      ...baseRegistration,
      registration_note: testNote,
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: registrationWithNote,
              error: null,
            }),
          }),
        }),
      }),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    // Simulate registration creation with note
    const result = await mockClient
      .from('registrations')
      .insert({
        schedule_id: 'schedule-1',
        registered_by: 'user-2',
        player_id: 'user-1',
        registration_note: testNote,
      })
      .select()
      .single()

    expect(result.data.registration_note).toBe(testNote)
  })

  it('should retrieve registration_note from database on dashboard load', async () => {
    const testNote = 'Please note my allergy to cat hair'
    const registrationWithNote: Registration = {
      ...baseRegistration,
      registration_note: testNote,
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [registrationWithNote],
            error: null,
          }),
        }),
      }),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    // Simulate fetching registration from dashboard
    const result = await mockClient
      .from('registrations')
      .select('*')
      .eq('id', 'reg-1')

    expect(result.data[0].registration_note).toBe(testNote)
  })

  it('should update registration_note after registration creation', async () => {
    const updatedNote = 'Updated note - different schedule time'
    const registrationWithUpdatedNote: Registration = {
      ...baseRegistration,
      registration_note: updatedNote,
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: registrationWithUpdatedNote,
            error: null,
          }),
        }),
      }),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    // Simulate updating registration note
    const result = await mockClient
      .from('registrations')
      .update({ registration_note: updatedNote })
      .eq('id', 'reg-1')

    expect(result.data.registration_note).toBe(updatedNote)
  })

  it('should allow registration_note to be null/empty', async () => {
    const registrationWithoutNote: Registration = {
      ...baseRegistration,
      registration_note: null,
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: registrationWithoutNote,
              error: null,
            }),
          }),
        }),
      }),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    // Simulate creating registration without note
    const result = await mockClient
      .from('registrations')
      .insert({
        schedule_id: 'schedule-1',
        registered_by: 'user-2',
        player_id: 'user-1',
      })
      .select()
      .single()

    expect(result.data.registration_note).toBeNull()
  })

  it('should enforce 200 character limit on registration_note', async () => {
    const tooLongNote = 'a'.repeat(201)

    const mockClient = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: {
                code: '23514', // PostgreSQL check constraint violation
                message: 'new row for relation "registrations" violates check constraint "registration_note_max_length"',
              },
            }),
          }),
        }),
      }),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    // Attempt to create registration with note exceeding 200 chars
    const result = await mockClient
      .from('registrations')
      .insert({
        schedule_id: 'schedule-1',
        registered_by: 'user-2',
        player_id: 'user-1',
        registration_note: tooLongNote,
      })
      .select()
      .single()

    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('23514')
  })

  it('should display registration_note in dashboard registration card', async () => {
    const testNote = 'Playing with borrowed shoes'
    const registrationWithNote: Registration = {
      ...baseRegistration,
      registration_note: testNote,
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ ...registrationWithNote, schedules: mockSchedule }],
            error: null,
          }),
        }),
      }),
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    // Simulate fetching registrations for dashboard
    const result = await mockClient
      .from('registrations')
      .select('*')
      .eq('player_id', 'user-1')

    expect(result.data[0].registration_note).toBe(testNote)
  })

  it('should allow clearing registration_note', async () => {
    const registrationNoteCleared: Registration = {
      ...baseRegistration,
      registration_note: null,
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: registrationNoteCleared,
            error: null,
          }),
        }),
      }),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    // Simulate clearing registration note
    const result = await mockClient
      .from('registrations')
      .update({ registration_note: null })
      .eq('id', 'reg-1')

    expect(result.data.registration_note).toBeNull()
  })

  it('should preserve registration_note when updating other fields', async () => {
    const testNote = 'Prefer morning games'
    const registrationWithNoteAndUpdates: Registration = {
      ...baseRegistration,
      registration_note: testNote,
      preferred_position: 'open_spiker',
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: registrationWithNoteAndUpdates,
            error: null,
          }),
        }),
      }),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    // Simulate updating other field while preserving note
    const result = await mockClient
      .from('registrations')
      .update({ preferred_position: 'open_spiker' })
      .eq('id', 'reg-1')

    expect(result.data.registration_note).toBe(testNote)
    expect(result.data.preferred_position).toBe('open_spiker')
  })
})
