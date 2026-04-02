'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, UserPlus, Users, Trophy } from 'lucide-react'
import type { ScheduleWithSlots, PlayerPosition } from '@/types'
import { POSITION_LABELS } from '@/lib/constants/labels'

type RegistrationMode = 'single' | 'group' | 'team'
type PlayerInputType = 'existing' | 'guest'

type SearchResult = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  skill_level: string | null
}

type PlayerEntry =
  | {
      id: string
      type: 'existing'
      user_id: string
      first_name: string
      last_name: string
      preferred_position: PlayerPosition | null
    }
  | {
      id: string
      type: 'guest'
      first_name: string
      last_name: string
      email: string
      phone?: string
      skill_level: string | null
      preferred_position: PlayerPosition | null
    }

interface AdminRegistrationDialogProps {
  open: boolean
  schedule: ScheduleWithSlots
  onClose: () => void
  onSuccess: () => void
}

const POSITIONS = Object.entries(POSITION_LABELS) as [PlayerPosition, string][]

export function AdminRegistrationDialog({
  open,
  schedule,
  onClose,
  onSuccess,
}: AdminRegistrationDialogProps) {
  const [mode, setMode] = useState<RegistrationMode>('single')
  const [players, setPlayers] = useState<PlayerEntry[]>([])
  const [playerInputType, setPlayerInputType] = useState<PlayerInputType>('existing')

  // Existing player search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  // Guest player form state
  const [guestFirstName, setGuestFirstName] = useState('')
  const [guestLastName, setGuestLastName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestPosition, setGuestPosition] = useState<PlayerPosition | null>(null)

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setMode('single')
      setPlayers([])
      setPlayerInputType('existing')
      setSearchQuery('')
      setSearchResults([])
      setGuestFirstName('')
      setGuestLastName('')
      setGuestEmail('')
      setGuestPhone('')
      setGuestPosition(null)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }

    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    searchDebounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        if (response.ok) {
          const results = await response.json()
          setSearchResults(results)
        }
      } catch {
        // silently fail — search is best-effort
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [searchQuery])

  const handleAddExistingPlayer = (result: SearchResult) => {
    if (players.some((p) => p.type === 'existing' && p.user_id === result.id)) {
      toast.error('Player already added')
      return
    }

    const newPlayer: PlayerEntry = {
      id: `existing-${result.id}`,
      type: 'existing',
      user_id: result.id,
      first_name: result.first_name ?? '',
      last_name: result.last_name ?? '',
      preferred_position: null,
    }

    setPlayers((prev) => [...prev, newPlayer])
    setSearchQuery('')
    setSearchResults([])
  }

  const handleRemovePlayer = (playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId))
  }

  const handleUpdatePosition = (playerId: string, position: PlayerPosition | null) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId ? { ...p, preferred_position: position } : p
      )
    )
  }

  const buildPlayersPayload = () => {
    const allPlayers: PlayerEntry[] = [...players]

    // If in guest mode and there's guest form data, include the current guest form as a player
    if (
      playerInputType === 'guest' &&
      guestFirstName.trim() &&
      guestLastName.trim() &&
      guestEmail.trim()
    ) {
      allPlayers.push({
        id: `guest-form-${Date.now()}`,
        type: 'guest',
        first_name: guestFirstName.trim(),
        last_name: guestLastName.trim(),
        email: guestEmail.trim(),
        phone: guestPhone.trim() || undefined,
        skill_level: null,
        preferred_position: guestPosition,
      })
    }

    return allPlayers
  }

  const handleSubmit = async () => {
    const allPlayers = buildPlayersPayload()

    if (allPlayers.length === 0) {
      toast.error('Add at least one player before registering')
      return
    }

    setIsSubmitting(true)

    try {
      const body = {
        schedule_id: schedule.id,
        registration_mode: mode,
        payment_status: 'pending',
        team_preference: 'shuffle',
        players: allPlayers.map((p) => {
          if (p.type === 'existing') {
            return {
              type: 'existing' as const,
              user_id: p.user_id,
              preferred_position: p.preferred_position,
            }
          } else {
            return {
              type: 'guest' as const,
              first_name: p.first_name,
              last_name: p.last_name,
              email: p.email,
              phone: p.phone,
              skill_level: p.skill_level,
              preferred_position: p.preferred_position,
            }
          }
        }),
      }

      const response = await fetch('/api/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg =
          data?.error ??
          data?.results?.find((r: { success: boolean; error?: string }) => !r.success)?.error ??
          'Registration failed'
        toast.error(errorMsg)
        return
      }

      toast.success(`Successfully registered ${allPlayers.length} player${allPlayers.length > 1 ? 's' : ''}`)
      onSuccess()
      onClose()
    } catch {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-base font-medium">Admin Registration</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Mode selector */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Registration Mode</Label>
            <div className="flex gap-2">
              {(['single', 'group', 'team'] as RegistrationMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer
                    ${mode === m
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  {m === 'single' && <UserPlus className="h-3.5 w-3.5" />}
                  {m === 'group' && <Users className="h-3.5 w-3.5" />}
                  {m === 'team' && <Trophy className="h-3.5 w-3.5" />}
                  {m === 'single' ? 'Single' : m === 'group' ? 'Group' : 'Team'}
                </button>
              ))}
            </div>
          </div>

          {/* Player input type selector */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Add Player</Label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setPlayerInputType('existing')}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer
                  ${playerInputType === 'existing'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
              >
                Existing Player
              </button>
              <button
                type="button"
                onClick={() => setPlayerInputType('guest')}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer
                  ${playerInputType === 'guest'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
              >
                Guest Player
              </button>
            </div>

            {/* Existing player search */}
            {playerInputType === 'existing' && (
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searching && (
                  <p className="text-xs text-muted-foreground">Searching...</p>
                )}
                {searchResults.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => handleAddExistingPlayer(result)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors cursor-pointer border-b border-border last:border-b-0 text-left"
                      >
                        <span className="font-medium">
                          {result.first_name} {result.last_name}
                        </span>
                        <span className="text-muted-foreground text-xs">{result.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Guest player form */}
            {playerInputType === 'guest' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="First"
                    value={guestFirstName}
                    onChange={(e) => setGuestFirstName(e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder="Last"
                    value={guestLastName}
                    onChange={(e) => setGuestLastName(e.target.value)}
                  />
                </div>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
                <Input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                />
                <select
                  value={guestPosition ?? ''}
                  onChange={(e) => setGuestPosition((e.target.value as PlayerPosition) || null)}
                  className="w-full text-sm bg-background border border-border rounded-lg px-2 py-1.5 text-foreground"
                >
                  <option value="">Position (optional)</option>
                  {POSITIONS.map(([pos, label]) => (
                    <option key={pos} value={pos}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Player list (existing players added via search) */}
          {players.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Players ({players.length})
              </Label>
              <div className="space-y-2">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {player.first_name} {player.last_name}
                        {player.type === 'guest' && (
                          <span className="ml-1 text-xs text-muted-foreground">(Guest)</span>
                        )}
                      </p>
                    </div>
                    <select
                      value={player.preferred_position ?? ''}
                      onChange={(e) =>
                        handleUpdatePosition(
                          player.id,
                          (e.target.value as PlayerPosition) || null
                        )
                      }
                      className="text-xs bg-background border border-border rounded px-1.5 py-1 text-foreground"
                    >
                      <option value="">Position</option>
                      {POSITIONS.map(([pos, label]) => (
                        <option key={pos} value={pos}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemovePlayer(player.id)}
                      aria-label={`Remove ${player.first_name} ${player.last_name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-muted/50">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registering...' : 'Register Players'}
          </Button>
        </div>
      </div>
    </div>
  )
}
