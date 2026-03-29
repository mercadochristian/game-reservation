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
  | { id: string; type: 'guest'; first_name: string; last_name: string; email: string; gender: string | null; phone?: string; skill_level: string | null; preferred_position: PlayerPosition | null }

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

function computeCartTotal(
  selectedSchedules: Record<string, ScheduleSlot>,
  mode: 'solo' | 'group' | 'team',
  position: PlayerPosition | null,
  groupPlayers: GroupPlayer_[]
): { totalAmount: number; costLines: Array<{ label: string; amount: number }> } {
  const costLines: Array<{ label: string; amount: number }> = []

  if (Object.keys(selectedSchedules).length === 0) {
    return { totalAmount: 0, costLines: [] }
  }

  if (mode === 'solo') {
    Object.values(selectedSchedules).forEach(slot => {
      const amount = computeSoloAmount(
        {
          position_prices: slot.schedule.position_prices as Record<string, number>,
          team_price: slot.schedule.team_price,
        },
        position
      )
      costLines.push({ label: slot.schedule.locations?.name || 'Game', amount })
    })
  } else if (mode === 'group') {
    const primarySlot = Object.values(selectedSchedules)[0]
    groupPlayers.forEach(player => {
      const amount = computeSoloAmount(
        {
          position_prices: primarySlot.schedule.position_prices as Record<string, number>,
          team_price: primarySlot.schedule.team_price,
        },
        player.preferred_position
      )
      costLines.push({ label: `${player.first_name} ${player.last_name}`, amount })
    })
  } else {
    const primarySlot = Object.values(selectedSchedules)[0]
    const teamPrice = primarySlot.schedule.team_price || 0
    costLines.push({ label: 'Team Registration', amount: teamPrice })
  }

  const totalAmount = costLines.reduce((sum, line) => sum + line.amount, 0)

  return { totalAmount, costLines }
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
  const [cartModalOpen, setCartModalOpen] = useState(false)
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
  const [newPlayerForm, setNewPlayerForm] = useState<{ type: 'existing' | 'guest'; first_name: string; last_name: string; email: string; gender: string | null; phone: string; skill_level: string | null; preferred_position: PlayerPosition | null }>({
    type: 'existing',
    first_name: '',
    last_name: '',
    email: '',
    gender: null,
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
        gender: newPlayerForm.gender,
        phone: newPlayerForm.phone || undefined,
        skill_level: newPlayerForm.skill_level,
        preferred_position: null,
      } as GroupPlayer_,
    ])

    setNewPlayerForm({
      type: 'existing',
      first_name: '',
      last_name: '',
      email: '',
      gender: null,
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
              gender: p.gender,
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
  const { totalAmount } = computeCartTotal(selectedSchedules, mode, position, groupPlayers)
  const scheduleCount = Object.keys(selectedSchedules).length

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
      <div className="min-h-[100dvh] bg-background">
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
        <div className="min-h-[100dvh] bg-background">
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
      <div className="min-h-[100dvh] bg-background">
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
    <div className="flex min-h-[100dvh] bg-background">

      {/* ── MOBILE: Top nav ── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-20 flex items-center justify-between px-4 h-14 bg-[#0f172a]">
        <button
          onClick={() => router.push(`/?date=${dateParam || ''}`)}
          className="flex items-center gap-1 text-sm text-sky-400 cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Back</span>
        </button>
        <span className="text-sm font-bold text-white">Register</span>
        <button
          onClick={() => setCartModalOpen(true)}
          className="flex flex-col items-end cursor-pointer"
          aria-label="View cart"
        >
          <span className="text-[10px] text-slate-500 leading-none">{scheduleCount} {scheduleCount === 1 ? 'game' : 'games'}</span>
          <span className="text-sm font-extrabold text-sky-400 leading-none">₱{totalAmount.toFixed(0)} ▸</span>
        </button>
      </div>

      {/* ── DESKTOP: Left cart panel ── */}
      <aside className="hidden lg:flex flex-col w-[300px] shrink-0 bg-[#0f172a] sticky top-0 h-screen overflow-y-auto">
        {/* Header */}
        <div className="px-5 pt-6 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Your Games</p>
        </div>

        {/* Selected game cards */}
        <div className="flex-1 overflow-y-auto px-5 space-y-3 pb-4">
          {Object.entries(selectedSchedules).map(([id, slot], idx) => {
            const isPrimary = idx === 0
            const s = slot.schedule
            return (
              <div key={id} className="relative bg-[#1e293b] rounded-lg p-3">
                {!isPrimary && (
                  <button
                    onClick={() => handleRemoveSchedule(id)}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#334155] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                    aria-label="Remove game"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                <p className="text-[13px] font-bold text-white pr-6">{s.locations?.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {formatScheduleDateWithWeekday(s.start_time)} · {formatScheduleTime(s.start_time)}
                </p>
                <p className="text-[11px] text-slate-400 text-xs mt-0.5">{s.locations?.address}</p>
                <p className="text-[15px] font-extrabold text-sky-400 mt-2">
                  ₱{computeSoloAmount(
                    { position_prices: s.position_prices as Record<string, number>, team_price: s.team_price },
                    position
                  ).toFixed(0)}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  {(s.max_players - slot.registrationCount)} spots remaining
                </p>
              </div>
            )
          })}

          {/* Inline add-game expand */}
          <div className="border border-dashed border-[#334155] rounded-lg overflow-hidden">
            <button
              onClick={() => {
                if (!availableLoaded) fetchAvailableSchedules()
                setPanelOpen(!panelOpen)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              {panelOpen ? 'Hide games' : 'Add another game'}
            </button>

            <AnimatePresence>
              {panelOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden bg-[#020617] border-t border-[#1e293b]"
                >
                  {availableLoading ? (
                    <div className="p-3 space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-8 bg-[#1e293b] rounded animate-pulse" />
                      ))}
                    </div>
                  ) : availableSchedules.length === 0 ? (
                    <p className="text-[11px] text-slate-500 text-center py-4">No additional games available</p>
                  ) : (
                    <div>
                      {availableSchedules.map(s => (
                        <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#0f172a] last:border-b-0">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-white truncate">{s.locations?.name}</p>
                            <p className="text-[10px] text-sky-400">
                              {formatScheduleDateWithWeekday(s.start_time)} · ₱{computeSoloAmount(
                                { position_prices: s.position_prices as Record<string, number>, team_price: s.team_price },
                                position
                              ).toFixed(0)}
                            </p>
                          </div>
                          <Button size="xs" onClick={() => handleAddSchedule(s)} className="shrink-0">
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Spacer + Total + CTA */}
        <div className="flex-shrink-0 mt-auto border-t border-[#1e293b] px-5 py-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-[11px] text-slate-500">Total</p>
            <p className="text-[18px] font-extrabold text-white">₱{totalAmount.toFixed(0)}</p>
          </div>
          <Button
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
            className="w-full bg-[#1d4ed8] text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting
              ? 'Registering...'
              : mode === 'solo'
                ? `Register → (${scheduleCount})`
                : `Register ${groupPlayers.length} →`}
          </Button>
        </div>
      </aside>

      {/* ── Form panel (right on desktop, full-width on mobile) ── */}
      <main className="flex-1 overflow-y-auto pt-14 pb-20 px-4 lg:pt-8 lg:pb-8 lg:px-8">
        {/* form content — Task 4 */}
      </main>

      {/* ── MOBILE: Fixed footer bar ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-[#0f172a] px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-slate-500">{scheduleCount} {scheduleCount === 1 ? 'game' : 'games'} selected</p>
          <p className="text-sm font-extrabold text-sky-400">₱{totalAmount.toFixed(0)}</p>
        </div>
        {/* register button — Task 5 */}
      </div>

      {/* ── MOBILE: Cart modal ── Task 4 */}

      {/* Payment Channels Modal (unchanged) */}
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
