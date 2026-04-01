import { describe, it, expect } from 'vitest'
import { dialogReducer, initialDialogState } from '../registrations-client'
import type { RegistrationWithDetails } from '@/types'

// Helper: build a minimal RegistrationWithDetails stub
function makeRegistration(overrides: Partial<RegistrationWithDetails> = {}): RegistrationWithDetails {
  return {
    id: 'reg-1',
    schedule_id: 'sched-1',
    registered_by: 'user-1',
    player_id: 'user-1',
    preferred_position: 'setter',
    team_preference: 'shuffle',
    payment_status: 'pending',
    payment_proof_url: null,
    payment_channel_id: null,
    extracted_amount: null,
    extracted_reference: null,
    extracted_datetime: null,
    extracted_sender: null,
    extraction_confidence: null,
    extracted_raw: null,
    registration_note: null,
    attended: false,
    qr_token: null,
    lineup_team_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    users: {
      id: 'user-1',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      skill_level: 'intermediate',
      is_guest: false,
    },
    team_members: [],
    ...overrides,
  }
}

describe('dialogReducer', () => {
  describe('initialDialogState', () => {
    it('has registerDialogOpen = false', () => {
      expect(initialDialogState.registerDialogOpen).toBe(false)
    })

    it('has registrationMode = "single"', () => {
      expect(initialDialogState.registrationMode).toBe('single')
    })

    it('has one empty player entry', () => {
      expect(initialDialogState.players).toHaveLength(1)
      expect(initialDialogState.players[0]).toEqual({ type: 'empty' })
    })

    it('has paymentStatus = "pending"', () => {
      expect(initialDialogState.paymentStatus).toBe('pending')
    })

    it('has submitting = false', () => {
      expect(initialDialogState.submitting).toBe(false)
    })

    it('has empty searchQuery', () => {
      expect(initialDialogState.searchQuery).toBe('')
    })

    it('has empty searchResults array', () => {
      expect(initialDialogState.searchResults).toEqual([])
    })

    it('has searching = false', () => {
      expect(initialDialogState.searching).toBe(false)
    })

    it('has selectedPlayer = null', () => {
      expect(initialDialogState.selectedPlayer).toBeNull()
    })
  })

  describe('OPEN_REGISTER', () => {
    it('sets registerDialogOpen to true', () => {
      const next = dialogReducer(initialDialogState, { type: 'OPEN_REGISTER' })
      expect(next.registerDialogOpen).toBe(true)
    })

    it('resets registrationMode to "single"', () => {
      const state = { ...initialDialogState, registrationMode: 'team' as const }
      const next = dialogReducer(state, { type: 'OPEN_REGISTER' })
      expect(next.registrationMode).toBe('single')
    })

    it('resets players to one empty entry', () => {
      const state = {
        ...initialDialogState,
        players: [
          { type: 'guest' as const, first_name: 'A', last_name: 'B', email: 'a@b.com', phone: '', preferred_position: 'setter' },
        ],
      }
      const next = dialogReducer(state, { type: 'OPEN_REGISTER' })
      expect(next.players).toHaveLength(1)
      expect(next.players[0]).toEqual({ type: 'empty' })
    })

    it('resets paymentStatus to "pending"', () => {
      const state = { ...initialDialogState, paymentStatus: 'paid' as const }
      const next = dialogReducer(state, { type: 'OPEN_REGISTER' })
      expect(next.paymentStatus).toBe('pending')
    })
  })

  describe('CLOSE_REGISTER', () => {
    it('sets registerDialogOpen to false', () => {
      const state = { ...initialDialogState, registerDialogOpen: true }
      const next = dialogReducer(state, { type: 'CLOSE_REGISTER' })
      expect(next.registerDialogOpen).toBe(false)
    })

    it('resets players to one empty entry', () => {
      const state = {
        ...initialDialogState,
        players: [
          { type: 'existing' as const, user_id: 'u1', display_name: 'John', preferred_position: 'setter' },
        ],
      }
      const next = dialogReducer(state, { type: 'CLOSE_REGISTER' })
      expect(next.players).toHaveLength(1)
      expect(next.players[0]).toEqual({ type: 'empty' })
    })

    it('resets paymentStatus to "pending"', () => {
      const state = { ...initialDialogState, paymentStatus: 'rejected' as const }
      const next = dialogReducer(state, { type: 'CLOSE_REGISTER' })
      expect(next.paymentStatus).toBe('pending')
    })

    it('clears searchResults and searchQuery', () => {
      const state = {
        ...initialDialogState,
        searchQuery: 'Jane',
        searchResults: [{ id: 'u1', first_name: 'Jane', last_name: 'Doe', email: 'j@d.com', skill_level: null }],
      }
      const next = dialogReducer(state, { type: 'CLOSE_REGISTER' })
      expect(next.searchResults).toEqual([])
      expect(next.searchQuery).toBe('')
    })
  })

  describe('SET_MODE', () => {
    it('sets registrationMode to "group"', () => {
      const next = dialogReducer(initialDialogState, { type: 'SET_MODE', mode: 'group' })
      expect(next.registrationMode).toBe('group')
    })

    it('sets registrationMode to "team"', () => {
      const next = dialogReducer(initialDialogState, { type: 'SET_MODE', mode: 'team' })
      expect(next.registrationMode).toBe('team')
    })

    it('sets registrationMode back to "single"', () => {
      const state = { ...initialDialogState, registrationMode: 'team' as const }
      const next = dialogReducer(state, { type: 'SET_MODE', mode: 'single' })
      expect(next.registrationMode).toBe('single')
    })

    it('does not mutate other fields', () => {
      const next = dialogReducer(initialDialogState, { type: 'SET_MODE', mode: 'group' })
      expect(next.registerDialogOpen).toBe(initialDialogState.registerDialogOpen)
      expect(next.players).toBe(initialDialogState.players)
    })
  })

  describe('SET_PLAYERS', () => {
    it('replaces the players array with the provided value', () => {
      const newPlayers = [
        { type: 'existing' as const, user_id: 'u1', display_name: 'Alice', preferred_position: 'setter' },
        { type: 'empty' as const },
      ]
      const next = dialogReducer(initialDialogState, { type: 'SET_PLAYERS', players: newPlayers })
      expect(next.players).toEqual(newPlayers)
    })

    it('does not mutate other fields', () => {
      const next = dialogReducer(initialDialogState, { type: 'SET_PLAYERS', players: [] })
      expect(next.registrationMode).toBe(initialDialogState.registrationMode)
    })
  })

  describe('SET_PAYMENT_STATUS', () => {
    it('sets paymentStatus to "paid"', () => {
      const next = dialogReducer(initialDialogState, { type: 'SET_PAYMENT_STATUS', status: 'paid' })
      expect(next.paymentStatus).toBe('paid')
    })

    it('sets paymentStatus to "review"', () => {
      const next = dialogReducer(initialDialogState, { type: 'SET_PAYMENT_STATUS', status: 'review' })
      expect(next.paymentStatus).toBe('review')
    })

    it('sets paymentStatus to "rejected"', () => {
      const next = dialogReducer(initialDialogState, { type: 'SET_PAYMENT_STATUS', status: 'rejected' })
      expect(next.paymentStatus).toBe('rejected')
    })
  })

  describe('SET_SUBMITTING', () => {
    it('sets submitting to true', () => {
      const next = dialogReducer(initialDialogState, { type: 'SET_SUBMITTING', submitting: true })
      expect(next.submitting).toBe(true)
    })

    it('sets submitting back to false', () => {
      const state = { ...initialDialogState, submitting: true }
      const next = dialogReducer(state, { type: 'SET_SUBMITTING', submitting: false })
      expect(next.submitting).toBe(false)
    })
  })

  describe('SET_SEARCH_QUERY', () => {
    it('updates searchQuery to the provided string', () => {
      const next = dialogReducer(initialDialogState, { type: 'SET_SEARCH_QUERY', query: 'Jane' })
      expect(next.searchQuery).toBe('Jane')
    })

    it('accepts an empty string', () => {
      const state = { ...initialDialogState, searchQuery: 'Jane' }
      const next = dialogReducer(state, { type: 'SET_SEARCH_QUERY', query: '' })
      expect(next.searchQuery).toBe('')
    })
  })

  describe('SET_SEARCH_RESULTS', () => {
    it('replaces searchResults with the provided array', () => {
      const results = [
        { id: 'u1', first_name: 'Jane', last_name: 'Doe', email: 'j@d.com', skill_level: 'intermediate' as const },
      ]
      const next = dialogReducer(initialDialogState, { type: 'SET_SEARCH_RESULTS', results })
      expect(next.searchResults).toEqual(results)
    })

    it('clears searchResults when given an empty array', () => {
      const state = {
        ...initialDialogState,
        searchResults: [{ id: 'u1', first_name: 'Jane', last_name: null, email: 'j@d.com', skill_level: null }],
      }
      const next = dialogReducer(state, { type: 'SET_SEARCH_RESULTS', results: [] })
      expect(next.searchResults).toEqual([])
    })
  })

  describe('SET_SEARCHING', () => {
    it('sets searching to true', () => {
      const next = dialogReducer(initialDialogState, { type: 'SET_SEARCHING', searching: true })
      expect(next.searching).toBe(true)
    })

    it('sets searching back to false', () => {
      const state = { ...initialDialogState, searching: true }
      const next = dialogReducer(state, { type: 'SET_SEARCHING', searching: false })
      expect(next.searching).toBe(false)
    })
  })

  describe('CLEAR_SEARCH', () => {
    it('clears searchResults', () => {
      const state = {
        ...initialDialogState,
        searchResults: [{ id: 'u1', first_name: 'Jane', last_name: null, email: 'j@d.com', skill_level: null }],
        searchQuery: 'Jane',
      }
      const next = dialogReducer(state, { type: 'CLEAR_SEARCH' })
      expect(next.searchResults).toEqual([])
    })

    it('clears searchQuery', () => {
      const state = { ...initialDialogState, searchQuery: 'Jane' }
      const next = dialogReducer(state, { type: 'CLEAR_SEARCH' })
      expect(next.searchQuery).toBe('')
    })

    it('does not affect other state fields', () => {
      const state = {
        ...initialDialogState,
        registrationMode: 'team' as const,
        searchQuery: 'Alice',
      }
      const next = dialogReducer(state, { type: 'CLEAR_SEARCH' })
      expect(next.registrationMode).toBe('team')
    })
  })

  describe('SELECT_PLAYER', () => {
    it('sets selectedPlayer to the provided registration', () => {
      const registration = makeRegistration()
      const next = dialogReducer(initialDialogState, { type: 'SELECT_PLAYER', player: registration })
      expect(next.selectedPlayer).toEqual(registration)
    })

    it('sets selectedPlayer to null (deselect)', () => {
      const state = { ...initialDialogState, selectedPlayer: makeRegistration() }
      const next = dialogReducer(state, { type: 'SELECT_PLAYER', player: null })
      expect(next.selectedPlayer).toBeNull()
    })

    it('does not affect other state fields', () => {
      const registration = makeRegistration()
      const next = dialogReducer(initialDialogState, { type: 'SELECT_PLAYER', player: registration })
      expect(next.registerDialogOpen).toBe(initialDialogState.registerDialogOpen)
      expect(next.registrationMode).toBe(initialDialogState.registrationMode)
    })
  })

  describe('unknown action (default branch)', () => {
    it('returns the current state unchanged for an unrecognized action type', () => {
      // Cast to any to bypass TypeScript exhaustive check
      const next = dialogReducer(initialDialogState, { type: 'UNKNOWN_ACTION' } as any)
      expect(next).toBe(initialDialogState)
    })
  })
})
