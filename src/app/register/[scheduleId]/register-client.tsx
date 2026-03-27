'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useHasAnimated } from '@/lib/hooks/useHasAnimated'
import { ChevronLeft, Upload, X, Plus, CheckCircle, AlertCircle, Search, CreditCard, CalendarX, Users, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { type ScheduleWithLocation, type PlayerPosition, type User } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ScheduleInfo } from '@/components/schedule-info'
import { PaymentChannelsModal } from '@/components/payment-channels-modal'
import { fadeUpVariants } from '@/lib/animations'
import { getUserFriendlyMessage } from '@/lib/errors/messages'
import { SKILL_LEVEL_LABELS, POSITION_LABELS } from '@/lib/constants/labels'
import { formatScheduleDateWithWeekday, formatScheduleTime } from '@/lib/utils/timezone'
import { formatScheduleLabel } from '@/lib/utils/schedule-label'
import { computeSoloAmount } from '@/lib/utils/pricing'

type ScheduleSlot = {
  schedule: ScheduleWithLocation
  registrationCount: number
}

type SubmitResult = {
  scheduleId: string
  success: boolean
  error?: string
}

type GroupPlayer_ =
  | { id: string; type: 'existing'; user_id: string; first_name: string; last_name: string; preferred_position: PlayerPosition | null }
  | { id: string; type: 'guest'; first_name: string; last_name: string; email: string; phone?: string; skill_level: string | null; preferred_position: PlayerPosition | null }

type SearchResult = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  skill_level: string | null
}

const TEAM_REQUIRED_POSITIONS = {
  setter: 1,
  middle_blocker: 2,
  open_spiker: 2,
  opposite_spiker: 1,
}

function countPositions(players: GroupPlayer_[]): Record<string, number> {
  const counts: Record<string, number> = {
    setter: 0,
    middle_blocker: 0,
    open_spiker: 0,
    opposite_spiker: 0,
  }
  for (const player of players) {
    const pos = player.preferred_position
    if (pos && pos in counts) {
      counts[pos]++
    }
  }
  return counts
}

export interface RegisterClientProps {
  scheduleId: string
  user: User
  skillError: boolean
  scheduleError: 'past' | 'full' | 'closed' | null
  primaryScheduleSlot: ScheduleSlot
  alreadyRegisteredIds: string[]
}

export function RegisterClient({
  scheduleId,
  user,
  skillError,
  scheduleError,
  primaryScheduleSlot,
  alreadyRegisteredIds,
}: RegisterClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasAnimated = useHasAnimated()
  const dateParam = searchParams.get('date')

  // Multi-schedule state — initialized directly from props
  const [selectedSchedules, setSelectedSchedules] = useState<Record<string, ScheduleSlot>>({
    [scheduleId]: primaryScheduleSlot,
  })
  const alreadyRegisteredSet = new Set<string>(alreadyRegisteredIds)
  const [availableSchedules, setAvailableSchedules] = useState<ScheduleWithLocation[]>([])
  const [availableLoaded, setAvailableLoaded] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [availableLoading, setAvailableLoading] = useState(false)

  // Form state
  const [position, setPosition] = useState<PlayerPosition | null>(null)
  const [paymentFile, setPaymentFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResults, setSubmitResults] = useState<SubmitResult[]>([])

  // Payment channels modal state
  const [showPaymentChannelsModal, setShowPaymentChannelsModal] = useState(false)
  const [selectedChannelId, setSelectedChannelId] = useState<string | undefined>()

  // Group registration state
  const [mode, setMode] = useState<'solo' | 'group' | 'team'>('solo')
  const [groupPlayers, setGroupPlayers] = useState<GroupPlayer_[]>([
    {
      id: `user-${user.id}`,
      type: 'existing',
      user_id: user.id,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      preferred_position: null,
    },
  ])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showAddPlayerForm, setShowAddPlayerForm] = useState(false)
  const [newPlayerForm, setNewPlayerForm] = useState<{ type: 'existing' | 'guest'; first_name: string; last_name: string; email: string; phone: string; skill_level: string | null; preferred_position: PlayerPosition | null }>({
    type: 'guest',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    skill_level: null,
    preferred_position: null,
  })
  const [groupResults, setGroupResults] = useState<Array<{ player_index: number; player_email_or_name: string; success: boolean; user_id?: string; error?: string }>>([])

  const fetchAvailableSchedules = async () => {
    if (availableLoaded) return

    setAvailableLoading(true)
    try {
      const supabase = createClient()

      const { data: allOpen } = (await supabase
        .from('schedules')
        .select('*, locations(id, name, address, google_map_url)')
        .eq('status', 'open')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })) as { data: ScheduleWithLocation[] }

      if (!allOpen) {
        setAvailableSchedules([])
        setAvailableLoaded(true)
        setAvailableLoading(false)
        return
      }

      const { data: regRows } = await supabase
        .from('registrations')
        .select('schedule_id')
        .in(
          'schedule_id',
          allOpen.map(s => s.id)
        )

      const regCounts: Record<string, number> = {}
      regRows?.forEach((row: any) => {
        regCounts[row.schedule_id] = (regCounts[row.schedule_id] ?? 0) + 1
      })

      const selectedIds = new Set(Object.keys(selectedSchedules))
      const filtered = allOpen.filter(
        s =>
          !selectedIds.has(s.id) &&
          !alreadyRegisteredSet.has(s.id) &&
          (regCounts[s.id] ?? 0) < s.max_players
      )

      setAvailableSchedules(filtered)
      setAvailableLoaded(true)
    } catch (err) {
      toast.error('Failed to load available schedules')
    } finally {
      setAvailableLoading(false)
    }
  }

  const handleAddSchedule = (schedule: ScheduleWithLocation) => {
    setSelectedSchedules(prev => ({
      ...prev,
      [schedule.id]: {
        schedule,
        registrationCount: 0,
      },
    }))
    setAvailableSchedules(prev => prev.filter(s => s.id !== schedule.id))
    setPanelOpen(false)
  }

  const handleRemoveSchedule = (sid: string) => {
    if (sid === Object.keys(selectedSchedules)[0]) {
      return // Can't remove primary schedule
    }
    setSelectedSchedules(prev => {
      const next = { ...prev }
      delete next[sid]
      return next
    })
  }

  // Search for existing users (group mode)
  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const results = await response.json()
        setSearchResults(results)
      }
    } catch (err) {
      console.error('Search error:', err)
      toast.error('Failed to search users')
    } finally {
      setSearching(false)
    }
  }

  const handleAddExistingPlayer = (searchResult: SearchResult) => {
    if (groupPlayers.some(p => p.type === 'existing' && p.user_id === searchResult.id)) {
      toast.error('Player already added')
      return
    }

    if (mode === 'group' && groupPlayers.length >= 5) {
      toast.error('Group allows up to 5 players')
      return
    }

    setGroupPlayers(prev => [
      ...prev,
      {
        id: `user-${searchResult.id}`,
        type: 'existing',
        user_id: searchResult.id,
        first_name: searchResult.first_name || '',
        last_name: searchResult.last_name || '',
        preferred_position: null,
      } as GroupPlayer_,
    ])
    setSearchQuery('')
    setSearchResults([])
    setShowAddPlayerForm(false)
    toast.success(`Added ${searchResult.first_name} ${searchResult.last_name}`)
  }

  const handleAddGuestPlayer = () => {
    if (!newPlayerForm.first_name || !newPlayerForm.last_name || !newPlayerForm.email) {
      toast.error('Please fill in required fields')
      return
    }

    if (mode === 'group' && groupPlayers.length >= 5) {
      toast.error('Group allows up to 5 players')
      return
    }

    setGroupPlayers(prev => [
      ...prev,
      {
        id: `guest-${Date.now()}`,
        type: 'guest',
        first_name: newPlayerForm.first_name,
        last_name: newPlayerForm.last_name,
        email: newPlayerForm.email,
        phone: newPlayerForm.phone || undefined,
        skill_level: newPlayerForm.skill_level,
        preferred_position: null,
      } as GroupPlayer_,
    ])

    setNewPlayerForm({
      type: 'guest',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      skill_level: null,
      preferred_position: null,
    })
    setShowAddPlayerForm(false)
    toast.success(`Added ${newPlayerForm.first_name} ${newPlayerForm.last_name}`)
  }

  const handleRemoveGroupPlayer = (playerId: string) => {
    setGroupPlayers(prev => prev.filter(p => p.id !== playerId))
  }

  const handleUpdateGroupPlayerPosition = (playerId: string, pos: PlayerPosition) => {
    setGroupPlayers(prev =>
      prev.map(p =>
        p.id === playerId
          ? { ...p, preferred_position: pos }
          : p
      )
    )
  }

  const handlePaymentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPaymentFile(file)
    }
  }

  const handleRemovePaymentFile = () => {
    setPaymentFile(null)
  }

  const handleRegister = async () => {
    if (mode === 'solo') {
      if (!position || !paymentFile || !user) {
        toast.error('Please complete all required fields')
        return
      }

      setIsSubmitting(true)

      try {
        const supabase = createClient()

        const fileExt = paymentFile.name.split('.').pop()
        const filename = `${user.id}/${Date.now()}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(filename, paymentFile)

        if (uploadError) {
          toast.error('Payment upload failed')
          setIsSubmitting(false)
          return
        }

        const paymentProofUrl = uploadData.path

        const results: SubmitResult[] = []
        for (const sid of Object.keys(selectedSchedules)) {
          const slot = selectedSchedules[sid]
          const { data: insertedData, error: insertError } = await (supabase.from('registrations') as any)
            .insert({
              schedule_id: sid,
              player_id: user.id,
              registered_by: user.id,
              preferred_position: position,
            })
            .select('id')

          results.push({
            scheduleId: sid,
            success: !insertError,
            error:
              insertError?.code === '23505'
                ? 'Already registered'
                : getUserFriendlyMessage(insertError),
          })

          if (!insertError && insertedData?.[0]?.id) {
            const requiredAmount = computeSoloAmount(
              {
                position_prices: slot.schedule.position_prices as Record<string, number>,
                team_price: slot.schedule.team_price,
              },
              position
            )
            const { error: paymentError } = await (supabase.from('registration_payments') as any)
              .insert({
                registration_id: insertedData[0].id,
                payer_id: user.id,
                schedule_id: sid,
                registration_type: 'solo',
                required_amount: requiredAmount,
                payment_status: 'pending',
                payment_proof_url: paymentProofUrl,
                payment_channel_id: selectedChannelId || null,
              })

            if (paymentError) {
              console.error('[Registration] Failed to create registration_payments:', paymentError)
            }

            fetch('/api/payment-proof/extract', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_payment_id: insertedData[0].id,
                payment_proof_url: paymentProofUrl,
              }),
            }).catch(err => console.warn('[Registration] Extraction failed silently:', err))
          }
        }

        setSubmitResults(results)

        const allSuccess = results.every(r => r.success)
        if (allSuccess) {
          toast.success(`Registered for ${results.length} ${results.length === 1 ? 'game' : 'games'}!`)
          router.push(`/?date=${dateParam || ''}`)
        }
      } catch (err) {
        toast.error('An error occurred')
        setIsSubmitting(false)
      }
    } else {
      await handleGroupRegister()
    }
  }

  const handleGroupRegister = async () => {
    const missingPositions = groupPlayers.filter(p => !p.preferred_position)
    if (missingPositions.length > 0) {
      toast.error('All players must have a position selected')
      return
    }

    if (!paymentFile || !user) {
      toast.error('Please upload payment proof')
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()

      const fileExt = paymentFile.name.split('.').pop()
      const filename = `${user.id}/${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filename, paymentFile)

      if (uploadError) {
        toast.error('Payment upload failed')
        setIsSubmitting(false)
        return
      }

      const paymentProofPath = uploadData.path

      const primaryScheduleId = Object.keys(selectedSchedules)[0]
      const apiPayload = {
        schedule_id: primaryScheduleId,
        payment_proof_path: paymentProofPath,
        registration_mode: mode as 'group' | 'team',
        payment_channel_id: selectedChannelId || null,
        players: groupPlayers.map(p => {
          const basePlayer = {
            preferred_position: p.preferred_position as PlayerPosition,
          }
          if (p.type === 'existing') {
            return {
              type: 'existing',
              user_id: p.user_id,
              ...basePlayer,
            }
          } else {
            return {
              type: 'guest',
              first_name: p.first_name,
              last_name: p.last_name,
              email: p.email,
              phone: p.phone,
              ...basePlayer,
            }
          }
        }),
      }

      const response = await fetch('/api/register/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.issues) {
          const issuesStr = result.issues
            .map((issue: any) => {
              if (issue.min !== undefined && issue.provided < issue.min) {
                return `${issue.position} (need at least ${issue.min}, have ${issue.provided})`
              } else if (issue.max !== undefined && issue.provided > issue.max) {
                return `${issue.position} (max ${issue.max}, have ${issue.provided})`
              }
              return issue.position
            })
            .join(', ')
          toast.error(`Position issues: ${issuesStr}`)
        } else if (result.missing) {
          const missingStr = result.missing
            .map((m: any) => `${m.position} (need ${m.required}, have ${m.provided})`)
            .join(', ')
          toast.error(`Missing positions: ${missingStr}`)
        } else {
          setGroupResults(result.results || [])
          toast.error('Registration failed. Please try again.')
        }
        setIsSubmitting(false)
        return
      }

      setGroupResults(result.results || [])
      toast.success(`Registered ${result.results.length} ${result.results.length === 1 ? 'player' : 'players'}!`)
      router.push(`/?date=${dateParam || ''}`)
    } catch (err) {
      console.error('Group registration error:', err)
      toast.error('An error occurred during group registration')
      setIsSubmitting(false)
    }
  }

  const primarySchedule = primaryScheduleSlot.schedule

  // Error state
  if (skillError || scheduleError) {
    let errorIcon = AlertCircle
    let errorTitle = 'Unable to Register'
    let errorMessage: React.ReactNode = 'An error occurred'

    if (scheduleError === 'past') {
      errorIcon = CalendarX
      errorTitle = 'Registration Closed'
      errorMessage = 'This game has already started'
    } else if (scheduleError === 'full') {
      errorIcon = Users
      errorTitle = 'Schedule is Full'
      errorMessage = 'No more slots available for this game'
    } else if (scheduleError === 'closed') {
      errorIcon = XCircle
      errorTitle = 'Schedule Unavailable'
      errorMessage = 'This schedule has been cancelled or completed'
    } else if (skillError) {
      errorTitle = 'Unable to Register'
      errorMessage = (
        <>
          Your current skill level ({SKILL_LEVEL_LABELS[user.skill_level!] || user.skill_level}) does not meet
          the requirements for this game. Required:{' '}
          {(primarySchedule as any).required_levels.map((l: string) => SKILL_LEVEL_LABELS[l]).join(', ')}
        </>
      )
    }

    const ErrorIcon = errorIcon

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-4 py-8">
          <button
            onClick={() => router.push(`/?date=${dateParam || ''}`)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <motion.div
            initial={hasAnimated.current ? false : "hidden"}
            animate="visible"
            variants={fadeUpVariants}
            className="space-y-4"
          >
            <h1 className="text-2xl font-bold">{formatScheduleLabel(primarySchedule)}</h1>
            <Card className="p-6 border-destructive/50 bg-destructive/5 flex gap-4">
              <ErrorIcon className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive mb-1">{errorTitle}</p>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    )
  }

  // Show result panel if submission is done
  if (submitResults.length > 0) {
    const allSuccess = submitResults.every(r => r.success)

    if (allSuccess) {
      return (
        <div className="min-h-screen bg-background">
          <div className="max-w-lg mx-auto px-4 py-8">
            <motion.div
              initial={hasAnimated.current ? false : "hidden"}
              animate="visible"
              variants={fadeUpVariants}
              className="text-center space-y-4"
            >
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <h1 className="text-2xl font-bold">Registration Complete!</h1>
              <p className="text-sm text-muted-foreground">
                You&apos;ve been registered for {submitResults.length} {submitResults.length === 1 ? 'game' : 'games'}.
              </p>
              <Button
                onClick={() => router.push(`/?date=${dateParam || ''}`)}
                className="w-full"
              >
                Return to Calendar
              </Button>
            </motion.div>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-4 py-8">
          <button
            onClick={() => router.push(`/?date=${dateParam || ''}`)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <motion.div
            initial={hasAnimated.current ? false : "hidden"}
            animate="visible"
            variants={fadeUpVariants}
            className="space-y-4"
          >
            <h1 className="text-xl font-bold">Registration Results</h1>
            <div className="space-y-2">
              {submitResults.map(result => (
                <Card key={result.scheduleId} className="p-3 flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    {result.error && (
                      <p className="text-xs text-muted-foreground">{result.error}</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
            <Button
              onClick={() => router.push(`/?date=${dateParam || ''}`)}
              className="w-full"
            >
              Done
            </Button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/?date=${dateParam || ''}`)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {/* Page Title + Solo/Group/Team Toggle */}
        <motion.div
          initial={hasAnimated.current ? false : "hidden"}
          animate="visible"
          variants={fadeUpVariants}
          custom={0}
          className="space-y-4 mb-6"
        >
          <h1 className="text-2xl font-bold">Register for Games</h1>
          <div className="flex gap-2">
            <Button
              variant={mode === 'solo' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('solo')}
            >
              Solo
            </Button>
            <Button
              variant={mode === 'group' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('group')}
            >
              Group
            </Button>
            <Button
              variant={mode === 'team' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('team')}
            >
              Team
            </Button>
          </div>
        </motion.div>

        {/* Selected Schedules Section */}
        <motion.div
          initial={hasAnimated.current ? false : "hidden"}
          animate="visible"
          variants={fadeUpVariants}
          custom={1}
          className="space-y-3 mb-8"
        >
          {Object.entries(selectedSchedules).map(([id, slot], idx) => {
            const isPrimary = idx === 0
            const s = slot.schedule
            return (
              <Card
                key={id}
                className="p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {isPrimary && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <ScheduleInfo schedule={s} />
                  </div>
                  {!isPrimary && (
                    <button
                      onClick={() => handleRemoveSchedule(id)}
                      className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </Card>
            )
          })}
        </motion.div>

        {/* Add Another Game Button */}
        <motion.div
          initial={hasAnimated.current ? false : "hidden"}
          animate="visible"
          variants={fadeUpVariants}
          custom={2}
          className="mb-6"
        >
          <button
            onClick={() => {
              if (!availableLoaded) {
                fetchAvailableSchedules()
              }
              setPanelOpen(!panelOpen)
            }}
            className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline"
          >
            <Plus className="h-4 w-4" />
            {panelOpen ? 'Hide available games' : 'Add another game'}
          </button>
        </motion.div>

        {/* Available Schedules Panel */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-6 overflow-hidden"
            >
              <Card className="p-4 space-y-3">
                {availableLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-12 bg-muted rounded animate-pulse"
                      />
                    ))}
                  </div>
                ) : availableSchedules.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No additional games available
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableSchedules.map(s => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-2 p-2 hover:bg-muted rounded transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{s.locations?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatScheduleDateWithWeekday(s.start_time)} · {formatScheduleTime(s.start_time)}
                          </p>
                        </div>
                        <Button
                          size="xs"
                          onClick={() => handleAddSchedule(s)}
                          className="flex-shrink-0"
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Solo Mode: Player Position */}
        {mode === 'solo' && (
          <motion.div
            initial={hasAnimated.current ? false : "hidden"}
            animate="visible"
            variants={fadeUpVariants}
            custom={3}
            className="mb-8"
          >
            <p className="text-sm font-medium mb-3 text-foreground">Player Position</p>
            <div className="space-y-2">
              {[
                { value: 'open_spiker' as const, label: 'Open Spiker' },
                { value: 'opposite_spiker' as const, label: 'Opposite Spiker' },
                { value: 'middle_blocker' as const, label: 'Middle Blocker' },
                { value: 'setter' as const, label: 'Setter' },
              ].map((option) => (
                <Card
                  key={option.value}
                  className={`p-3 cursor-pointer transition-colors ${
                    position === option.value
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setPosition(option.value)}
                  role="radio"
                  aria-checked={position === option.value}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setPosition(option.value)
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-4 w-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                        position === option.value
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{option.label}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Group Mode: Player List */}
        {mode === 'group' && (
          <motion.div
            initial={hasAnimated.current ? false : "hidden"}
            animate="visible"
            variants={fadeUpVariants}
            custom={3}
            className="mb-8 space-y-3"
          >
            <div>
              <p className="text-sm font-medium text-foreground">Players</p>
              <p className="text-xs text-muted-foreground">2–5 players · setter/opposite max 1 · MB/OS max 2</p>
            </div>
            <div className="space-y-2">
              {groupPlayers.map((player, idx) => {
                const isPrimary = idx === 0
                const positionOptions: Array<{ value: PlayerPosition; label: string }> = [
                  { value: 'open_spiker', label: 'Open Spiker' },
                  { value: 'opposite_spiker', label: 'Opposite Spiker' },
                  { value: 'middle_blocker', label: 'Middle Blocker' },
                  { value: 'setter', label: 'Setter' },
                ]

                return (
                  <Card key={player.id} className="p-3 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {`${player.first_name} ${player.last_name}`}
                          {isPrimary && ' (You)'}
                        </p>
                        {player.type === 'guest' && (
                          <p className="text-xs text-muted-foreground">{player.email}</p>
                        )}
                      </div>
                      {!isPrimary && (
                        <button
                          onClick={() => handleRemoveGroupPlayer(player.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Position selector */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Position</p>
                      <div className="grid grid-cols-2 gap-2">
                        {positionOptions.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => handleUpdateGroupPlayerPosition(player.id, opt.value)}
                            className={`p-2 rounded text-xs font-medium text-center transition-colors cursor-pointer ${
                              player.preferred_position === opt.value
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80 text-foreground'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            {/* Add Player Button */}
            <button
              onClick={() => setShowAddPlayerForm(!showAddPlayerForm)}
              className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline"
            >
              <Plus className="h-4 w-4" />
              {showAddPlayerForm ? 'Cancel' : 'Add Player'}
            </button>

            {/* Add Player Form */}
            <AnimatePresence>
              {showAddPlayerForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <Card className="p-4 space-y-3">
                    <div className="flex gap-2">
                      <Button
                        variant={newPlayerForm.type === 'existing' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNewPlayerForm(p => ({ ...p, type: 'existing' }))}
                      >
                        Existing Player
                      </Button>
                      <Button
                        variant={newPlayerForm.type === 'guest' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNewPlayerForm(p => ({ ...p, type: 'guest' }))}
                      >
                        Guest
                      </Button>
                    </div>

                    {newPlayerForm.type === 'existing' ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={e => handleSearchUsers(e.target.value)}
                            className="w-full px-3 py-2 text-sm border rounded bg-background"
                          />
                          {searching && (
                            <p className="text-xs text-muted-foreground mt-1">Searching...</p>
                          )}
                        </div>
                        {searchResults.length > 0 && (
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {searchResults.map(result => (
                              <button
                                key={result.id}
                                onClick={() => handleAddExistingPlayer(result)}
                                className="w-full text-left p-2 rounded hover:bg-muted text-sm transition-colors"
                              >
                                <p className="font-medium">
                                  {result.first_name} {result.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground">{result.email}</p>
                              </button>
                            ))}
                          </div>
                        )}
                        {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            No players found
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="First name"
                          value={newPlayerForm.first_name}
                          onChange={e => setNewPlayerForm(p => ({ ...p, first_name: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border rounded bg-background"
                        />
                        <input
                          type="text"
                          placeholder="Last name"
                          value={newPlayerForm.last_name}
                          onChange={e => setNewPlayerForm(p => ({ ...p, last_name: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border rounded bg-background"
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={newPlayerForm.email}
                          onChange={e => setNewPlayerForm(p => ({ ...p, email: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border rounded bg-background"
                        />
                        <input
                          type="tel"
                          placeholder="Phone (optional)"
                          value={newPlayerForm.phone}
                          onChange={e => setNewPlayerForm(p => ({ ...p, phone: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border rounded bg-background"
                        />
                        <select
                          value={newPlayerForm.skill_level || ''}
                          onChange={e => setNewPlayerForm(p => ({ ...p, skill_level: e.target.value || null }))}
                          className="w-full px-3 py-2 text-sm border rounded bg-background"
                        >
                          <option value="">Select skill level</option>
                          <option value="developmental">Developmental</option>
                          <option value="developmental_plus">Developmental+</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="intermediate_plus">Intermediate+</option>
                          <option value="advanced">Advanced</option>
                        </select>
                        <Button className="w-full" size="sm" onClick={handleAddGuestPlayer}>
                          Add Guest Player
                        </Button>
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Team Mode: Player List + Position Requirements */}
        {mode === 'team' && (
          <motion.div
            initial={hasAnimated.current ? false : "hidden"}
            animate="visible"
            variants={fadeUpVariants}
            custom={3}
            className="mb-8 space-y-3"
          >
            <div>
              <p className="text-sm font-medium text-foreground">Team Members</p>
              <p className="text-xs text-muted-foreground">Minimum 6 players · 1 Setter + 2 MB + 2 OS + 1 OPP</p>
            </div>
            <div className="space-y-2">
              {groupPlayers.map((player, idx) => {
                const isPrimary = idx === 0
                const positionOptions: Array<{ value: PlayerPosition; label: string }> = [
                  { value: 'open_spiker', label: 'Open Spiker' },
                  { value: 'opposite_spiker', label: 'Opposite Spiker' },
                  { value: 'middle_blocker', label: 'Middle Blocker' },
                  { value: 'setter', label: 'Setter' },
                ]

                return (
                  <Card key={player.id} className="p-3 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {`${player.first_name} ${player.last_name}`}
                          {isPrimary && ' (You)'}
                        </p>
                        {player.type === 'guest' && (
                          <p className="text-xs text-muted-foreground">{player.email}</p>
                        )}
                      </div>
                      {!isPrimary && (
                        <button
                          onClick={() => handleRemoveGroupPlayer(player.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Position</p>
                      <div className="grid grid-cols-2 gap-2">
                        {positionOptions.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => handleUpdateGroupPlayerPosition(player.id, opt.value)}
                            className={`p-2 rounded text-xs font-medium text-center transition-colors cursor-pointer ${
                              player.preferred_position === opt.value
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80 text-foreground'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            <button
              onClick={() => setShowAddPlayerForm(!showAddPlayerForm)}
              className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline"
            >
              <Plus className="h-4 w-4" />
              {showAddPlayerForm ? 'Cancel' : 'Add Member'}
            </button>

            <AnimatePresence>
              {showAddPlayerForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <Card className="p-4 space-y-3">
                    <div className="flex gap-2">
                      <Button
                        variant={newPlayerForm.type === 'existing' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNewPlayerForm(p => ({ ...p, type: 'existing' }))}
                      >
                        Existing Player
                      </Button>
                      <Button
                        variant={newPlayerForm.type === 'guest' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNewPlayerForm(p => ({ ...p, type: 'guest' }))}
                      >
                        Guest
                      </Button>
                    </div>

                    {newPlayerForm.type === 'existing' ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={e => handleSearchUsers(e.target.value)}
                            className="w-full px-3 py-2 text-sm border rounded bg-background"
                          />
                          {searching && (
                            <p className="text-xs text-muted-foreground mt-1">Searching...</p>
                          )}
                          {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded shadow-lg z-50">
                              {searchResults.map(result => (
                                <button
                                  key={result.id}
                                  onClick={() => handleAddExistingPlayer(result)}
                                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0 transition-colors"
                                >
                                  <p className="font-medium">{result.first_name} {result.last_name}</p>
                                  <p className="text-xs text-muted-foreground">{result.email}</p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="First name"
                          value={newPlayerForm.first_name}
                          onChange={e => setNewPlayerForm(p => ({ ...p, first_name: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border rounded bg-background"
                        />
                        <input
                          type="text"
                          placeholder="Last name"
                          value={newPlayerForm.last_name}
                          onChange={e => setNewPlayerForm(p => ({ ...p, last_name: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border rounded bg-background"
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={newPlayerForm.email}
                          onChange={e => setNewPlayerForm(p => ({ ...p, email: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border rounded bg-background"
                        />
                        <input
                          type="tel"
                          placeholder="Phone (optional)"
                          value={newPlayerForm.phone}
                          onChange={e => setNewPlayerForm(p => ({ ...p, phone: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border rounded bg-background"
                        />
                        <select
                          value={newPlayerForm.skill_level || ''}
                          onChange={e => setNewPlayerForm(p => ({ ...p, skill_level: e.target.value || null }))}
                          className="w-full px-3 py-2 text-sm border rounded bg-background"
                        >
                          <option value="">Select skill level</option>
                          <option value="developmental">Developmental</option>
                          <option value="developmental_plus">Developmental+</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="intermediate_plus">Intermediate+</option>
                          <option value="advanced">Advanced</option>
                        </select>
                        <Button className="w-full" size="sm" onClick={handleAddGuestPlayer}>
                          Add Guest Member
                        </Button>
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Position Requirements Checklist */}
            <Card className="p-4 space-y-3 border-yellow-500/30 bg-yellow-500/5">
              <p className="text-sm font-medium text-foreground">Team Position Requirements</p>
              {(() => {
                const counts = countPositions(groupPlayers)
                return (
                  <div className="space-y-2">
                    {Object.entries(TEAM_REQUIRED_POSITIONS).map(([pos, req]) => {
                      const provided = counts[pos] || 0
                      const met = provided >= req
                      return (
                        <div key={pos} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{pos.replace('_', ' ')}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${met ? 'text-green-500' : 'text-yellow-500'}`}>
                              {provided}/{req}
                            </span>
                            {met ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
              <p className="text-xs text-muted-foreground pt-2">Extra players beyond the minimum are allowed (bench players)</p>
            </Card>
          </motion.div>
        )}

        {/* Payment Summary */}
        {(() => {
          if (mode === 'solo') {
            const costLines: Array<{ label: string; amount: number }> = []
            let totalAmount = 0

            Object.entries(selectedSchedules).forEach(([_, slot]) => {
              const amount = computeSoloAmount(
                {
                  position_prices: slot.schedule.position_prices as Record<string, number>,
                  team_price: slot.schedule.team_price,
                },
                position
              )
              const schedule = slot.schedule
              const locationName = schedule.locations?.name || 'Unknown'
              const positionLabel = position ? POSITION_LABELS[position] : 'Unknown'
              costLines.push({
                label: `${locationName} - ${positionLabel}`,
                amount,
              })
              totalAmount += amount
            })

            if (costLines.length > 0) {
              return (
                <motion.div
                  initial={hasAnimated.current ? false : "hidden"}
                  animate="visible"
                  variants={fadeUpVariants}
                  custom={4}
                  className="mb-8"
                >
                  <Card className="p-4 space-y-3 border-blue-500/30 bg-blue-500/5">
                    <p className="text-sm font-medium text-foreground">Amount Due</p>
                    <div className="space-y-2">
                      {costLines.map((line, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{line.label}</span>
                          <span className="font-medium">₱{line.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    {costLines.length > 1 && (
                      <>
                        <div className="border-t border-blue-500/20 pt-2 flex items-center justify-between">
                          <span className="font-medium text-foreground">Total</span>
                          <span className="font-bold text-lg text-foreground">₱{totalAmount.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </Card>
                </motion.div>
              )
            }
          } else if (mode === 'group') {
            const costLines: Array<{ playerName: string; position: string; amount: number }> = []
            let totalAmount = 0

            const primaryScheduleId = Object.keys(selectedSchedules)[0]
            const primarySlot = selectedSchedules[primaryScheduleId]

            groupPlayers.forEach((player) => {
              const amount = computeSoloAmount(
                {
                  position_prices: primarySlot.schedule.position_prices as Record<string, number>,
                  team_price: primarySlot.schedule.team_price,
                },
                player.preferred_position
              )
              const playerName = `${player.first_name} ${player.last_name}`
              const positionLabel = player.preferred_position ? POSITION_LABELS[player.preferred_position] : 'Unknown'
              costLines.push({
                playerName,
                position: positionLabel,
                amount,
              })
              totalAmount += amount
            })

            if (costLines.length > 0) {
              return (
                <motion.div
                  initial={hasAnimated.current ? false : "hidden"}
                  animate="visible"
                  variants={fadeUpVariants}
                  custom={4}
                  className="mb-8"
                >
                  <Card className="p-4 space-y-3 border-blue-500/30 bg-blue-500/5">
                    <p className="text-sm font-medium text-foreground">Amount Due</p>
                    <div className="space-y-2">
                      {costLines.map((line, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div>
                            <p className="text-muted-foreground">{line.playerName}</p>
                            <p className="text-xs text-muted-foreground">{line.position}</p>
                          </div>
                          <span className="font-medium">₱{line.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    {costLines.length > 1 && (
                      <>
                        <div className="border-t border-blue-500/20 pt-2 flex items-center justify-between">
                          <span className="font-medium text-foreground">Total</span>
                          <span className="font-bold text-lg text-foreground">₱{totalAmount.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </Card>
                </motion.div>
              )
            }
          } else if (mode === 'team') {
            const primaryScheduleId = Object.keys(selectedSchedules)[0]
            const primarySlot = selectedSchedules[primaryScheduleId]
            const teamPrice = primarySlot.schedule.team_price || 0

            if (teamPrice > 0) {
              return (
                <motion.div
                  initial={hasAnimated.current ? false : "hidden"}
                  animate="visible"
                  variants={fadeUpVariants}
                  custom={4}
                  className="mb-8"
                >
                  <Card className="p-4 space-y-3 border-blue-500/30 bg-blue-500/5">
                    <p className="text-sm font-medium text-foreground">Amount Due</p>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Team Registration</span>
                      <span className="font-bold text-lg text-foreground">₱{teamPrice.toFixed(2)}</span>
                    </div>
                  </Card>
                </motion.div>
              )
            }
          }

          return null
        })()}

        {/* Payment Screenshot */}
        <motion.div
          initial={hasAnimated.current ? false : "hidden"}
          animate="visible"
          variants={fadeUpVariants}
          custom={5}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Payment Screenshot</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPaymentChannelsModal(true)}
              className="gap-2"
            >
              <CreditCard size={16} />
              View Payment Channels
            </Button>
          </div>
          <div className="space-y-3">
            {paymentFile ? (
              <Card className="p-3 bg-muted/50 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-sm truncate">{paymentFile.name}</p>
                </div>
                <button
                  onClick={handleRemovePaymentFile}
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </Card>
            ) : (
              <label className="block">
                <Card className="p-6 border-dashed cursor-pointer hover:bg-muted/50 transition-colors text-center">
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, JPEG up to 10MB</p>
                </Card>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePaymentFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </motion.div>

        {/* Submit Button */}
        <motion.div
          initial={hasAnimated.current ? false : "hidden"}
          animate="visible"
          variants={fadeUpVariants}
          custom={6}
          className="flex gap-2"
        >
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push(`/?date=${dateParam || ''}`)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleRegister}
            disabled={
              !paymentFile ||
              isSubmitting ||
              (mode === 'solo' && !position) ||
              ((mode === 'group' || mode === 'team') && groupPlayers.some(p => !p.preferred_position)) ||
              (mode === 'team' && (() => {
                const counts = countPositions(groupPlayers)
                return Object.entries(TEAM_REQUIRED_POSITIONS).some(([pos, req]) => (counts[pos] || 0) < req)
              })())
            }
            title={mode === 'team' && (() => {
              const counts = countPositions(groupPlayers)
              const missing = Object.entries(TEAM_REQUIRED_POSITIONS).filter(([pos, req]) => (counts[pos] || 0) < req)
              return missing.length > 0 ? `Missing: ${missing.map(([p, r]) => `${p}(${r})`).join(', ')}` : ''
            })() || ''}
          >
            {isSubmitting
              ? 'Registering...'
              : mode === 'solo'
                ? `Register (${Object.keys(selectedSchedules).length} ${Object.keys(selectedSchedules).length === 1 ? 'game' : 'games'})`
                : `Register ${groupPlayers.length} ${groupPlayers.length === 1 ? 'player' : 'players'}`}
          </Button>
        </motion.div>
      </div>

      {/* Payment Channels Modal */}
      <PaymentChannelsModal
        open={showPaymentChannelsModal}
        onOpenChange={setShowPaymentChannelsModal}
        onContinue={(channelId) => {
          setSelectedChannelId(channelId)
        }}
      />
    </div>
  )
}
