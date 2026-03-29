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

            // Payment record creation may fail — continue with registration
            paymentError

            fetch('/api/payment-proof/extract', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_payment_id: insertedData[0].id,
                payment_proof_url: paymentProofUrl,
              }),
            }).catch(() => {
              // Payment proof extraction failed silently — payment record exists without proof URL
            })
          }
        }

        setSubmitResults(results)

        const allSuccess = results.every(r => r.success)
        if (allSuccess) {
          toast.success(`Registered for ${results.length} ${results.length === 1 ? 'game' : 'games'}!`)
          await router.push(`/?date=${dateParam || ''}`)
          setIsSubmitting(false)
        } else {
          setIsSubmitting(false)
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
      await router.push(`/?date=${dateParam || ''}`)
      setIsSubmitting(false)
    } catch (err) {
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
      <div className="lg:hidden fixed top-0 inset-x-0 z-20 flex items-center justify-between px-4 h-14 bg-[#0f172a] gap-2">
        <button
          onClick={() => router.push(`/?date=${dateParam || ''}`)}
          className="flex items-center gap-1 text-sm text-sky-400 cursor-pointer flex-shrink-0"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="hidden sm:inline text-xs">Back</span>
        </button>
        <span className="text-sm font-bold text-white flex-1 text-center">Register</span>
        <button
          onClick={() => setCartModalOpen(true)}
          className="flex flex-col items-end cursor-pointer flex-shrink-0"
          aria-label="View cart"
        >
          <span className="text-[10px] text-slate-400 leading-none">{scheduleCount}G</span>
          <span className="text-xs font-extrabold text-sky-400 leading-none">₱{totalAmount.toFixed(0)}</span>
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
        {/* Title */}
        <motion.div
          initial={hasAnimated.current ? false : 'hidden'}
          animate="visible"
          variants={fadeUpVariants}
          custom={0}
          className="mb-6"
        >
          <h1 className="text-xl font-extrabold text-foreground">Registration Details</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Applies to {scheduleCount === 1 ? 'your selected game' : `all ${scheduleCount} selected games`}
          </p>
        </motion.div>

        {/* ── Section: Registration Mode ── */}
        <motion.div
          initial={hasAnimated.current ? false : 'hidden'}
          animate="visible"
          variants={fadeUpVariants}
          custom={1}
          className="mb-5"
        >
          <div className="border border-border rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Registration Mode</p>
            <div className="flex gap-2">
              {(['solo', 'group', 'team'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors cursor-pointer capitalize ${
                    mode === m
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/40'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Section: Position (Solo) ── */}
        {mode === 'solo' && (
          <motion.div
            initial={hasAnimated.current ? false : 'hidden'}
            animate="visible"
            variants={fadeUpVariants}
            custom={2}
            className="mb-5"
          >
            <div className="border border-border rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Your Position</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'open_spiker' as const, label: 'Open Spiker' },
                  { value: 'opposite_spiker' as const, label: 'Opposite Spiker' },
                  { value: 'middle_blocker' as const, label: 'Middle Blocker' },
                  { value: 'setter' as const, label: 'Setter' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => setPosition(opt.value)}
                    role="radio"
                    aria-checked={position === opt.value}
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setPosition(opt.value) }}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                      position === opt.value
                        ? 'bg-primary/10 border-primary'
                        : 'bg-background border-border hover:border-primary/40'
                    }`}
                  >
                    <div className={`h-3.5 w-3.5 rounded-full border-2 shrink-0 ${
                      position === opt.value ? 'bg-primary border-primary' : 'border-muted-foreground'
                    }`} />
                    <span className={`text-sm font-medium ${position === opt.value ? 'text-primary' : 'text-foreground'}`}>
                      {opt.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Section: Players (Group mode) ── */}
        {mode === 'group' && (
          <motion.div
            initial={hasAnimated.current ? false : 'hidden'}
            animate="visible"
            variants={fadeUpVariants}
            custom={2}
            className="mb-5"
          >
            <div className="border border-border rounded-xl p-4 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Players</p>
                <p className="text-xs text-muted-foreground mt-0.5">2–5 players · setter/opposite max 1 · MB/OS max 2</p>
              </div>
              <div className="space-y-2">
                {groupPlayers.map((player, idx) => {
                  const isPrimary = idx === 0
                  return (
                    <Card key={player.id} className="p-3 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{player.first_name} {player.last_name}{isPrimary && ' (You)'}</p>
                          {player.type === 'guest' && <p className="text-xs text-muted-foreground">{player.email}</p>}
                        </div>
                        {!isPrimary && (
                          <button onClick={() => handleRemoveGroupPlayer(player.id)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Position</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(['open_spiker', 'opposite_spiker', 'middle_blocker', 'setter'] as const).map(pos => (
                            <button
                              key={pos}
                              onClick={() => handleUpdateGroupPlayerPosition(player.id, pos)}
                              className={`p-2 rounded text-xs font-medium text-center transition-colors cursor-pointer ${
                                player.preferred_position === pos
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted hover:bg-muted/80 text-foreground'
                              }`}
                            >
                              {POSITION_LABELS[pos]}
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
                {showAddPlayerForm ? 'Cancel' : 'Add Player'}
              </button>
              <AnimatePresence>
                {showAddPlayerForm && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <Card className="p-4 space-y-3">
                      <div className="flex gap-2">
                        <Button variant={newPlayerForm.type === 'existing' ? 'default' : 'outline'} size="sm" onClick={() => setNewPlayerForm(p => ({ ...p, type: 'existing' }))}>Existing Player</Button>
                        <Button variant={newPlayerForm.type === 'guest' ? 'default' : 'outline'} size="sm" onClick={() => setNewPlayerForm(p => ({ ...p, type: 'guest' }))}>Guest</Button>
                      </div>
                      {newPlayerForm.type === 'existing' ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={e => handleSearchUsers(e.target.value)} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                            {searching && <p className="text-xs text-muted-foreground mt-1">Searching...</p>}
                          </div>
                          {searchResults.length > 0 && (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {searchResults.map(result => (
                                <button key={result.id} onClick={() => handleAddExistingPlayer(result)} className="w-full text-left p-2 rounded hover:bg-muted text-sm transition-colors">
                                  <p className="font-medium">{result.first_name} {result.last_name}</p>
                                  <p className="text-xs text-muted-foreground">{result.email}</p>
                                </button>
                              ))}
                            </div>
                          )}
                          {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                            <p className="text-xs text-muted-foreground text-center py-2">No players found</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input type="text" placeholder="First name" value={newPlayerForm.first_name} onChange={e => setNewPlayerForm(p => ({ ...p, first_name: e.target.value }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <input type="text" placeholder="Last name" value={newPlayerForm.last_name} onChange={e => setNewPlayerForm(p => ({ ...p, last_name: e.target.value }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <input type="email" placeholder="Email" value={newPlayerForm.email} onChange={e => setNewPlayerForm(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <input type="text" placeholder="Gender" value={newPlayerForm.gender || ''} onChange={e => setNewPlayerForm(p => ({ ...p, gender: e.target.value || null }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <select value={newPlayerForm.skill_level || ''} onChange={e => setNewPlayerForm(p => ({ ...p, skill_level: e.target.value || null }))} className="w-full px-3 py-2 text-sm border rounded bg-background">
                            <option value="">Select skill level</option>
                            <option value="developmental">Developmental</option>
                            <option value="developmental_plus">Developmental+</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="intermediate_plus">Intermediate+</option>
                            <option value="advanced">Advanced</option>
                          </select>
                          <input type="tel" placeholder="Phone (optional)" value={newPlayerForm.phone} onChange={e => setNewPlayerForm(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <Button className="w-full" size="sm" onClick={handleAddGuestPlayer}>Add Guest Player</Button>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── Section: Team Members ── */}
        {mode === 'team' && (
          <motion.div
            initial={hasAnimated.current ? false : 'hidden'}
            animate="visible"
            variants={fadeUpVariants}
            custom={2}
            className="mb-5"
          >
            <div className="border border-border rounded-xl p-4 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Team Members</p>
                <p className="text-xs text-muted-foreground mt-0.5">Minimum 6 · 1 Setter + 2 MB + 2 OS + 1 OPP</p>
              </div>
              <div className="space-y-2">
                {groupPlayers.map((player, idx) => {
                  const isPrimary = idx === 0
                  return (
                    <Card key={player.id} className="p-3 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{player.first_name} {player.last_name}{isPrimary && ' (You)'}</p>
                          {player.type === 'guest' && <p className="text-xs text-muted-foreground">{player.email}</p>}
                        </div>
                        {!isPrimary && (
                          <button onClick={() => handleRemoveGroupPlayer(player.id)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Position</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(['open_spiker', 'opposite_spiker', 'middle_blocker', 'setter'] as const).map(pos => (
                            <button
                              key={pos}
                              onClick={() => handleUpdateGroupPlayerPosition(player.id, pos)}
                              className={`p-2 rounded text-xs font-medium text-center transition-colors cursor-pointer ${
                                player.preferred_position === pos
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted hover:bg-muted/80 text-foreground'
                              }`}
                            >
                              {POSITION_LABELS[pos]}
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
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <Card className="p-4 space-y-3">
                      <div className="flex gap-2">
                        <Button variant={newPlayerForm.type === 'existing' ? 'default' : 'outline'} size="sm" onClick={() => setNewPlayerForm(p => ({ ...p, type: 'existing' }))}>Existing Player</Button>
                        <Button variant={newPlayerForm.type === 'guest' ? 'default' : 'outline'} size="sm" onClick={() => setNewPlayerForm(p => ({ ...p, type: 'guest' }))}>Guest</Button>
                      </div>
                      {newPlayerForm.type === 'existing' ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={e => handleSearchUsers(e.target.value)} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                            {searching && <p className="text-xs text-muted-foreground mt-1">Searching...</p>}
                            {searchResults.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded shadow-lg z-50">
                                {searchResults.map(result => (
                                  <button key={result.id} onClick={() => handleAddExistingPlayer(result)} className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0 transition-colors">
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
                          <input type="text" placeholder="First name" value={newPlayerForm.first_name} onChange={e => setNewPlayerForm(p => ({ ...p, first_name: e.target.value }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <input type="text" placeholder="Last name" value={newPlayerForm.last_name} onChange={e => setNewPlayerForm(p => ({ ...p, last_name: e.target.value }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <input type="email" placeholder="Email" value={newPlayerForm.email} onChange={e => setNewPlayerForm(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <input type="text" placeholder="Gender" value={newPlayerForm.gender || ''} onChange={e => setNewPlayerForm(p => ({ ...p, gender: e.target.value || null }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <select value={newPlayerForm.skill_level || ''} onChange={e => setNewPlayerForm(p => ({ ...p, skill_level: e.target.value || null }))} className="w-full px-3 py-2 text-sm border rounded bg-background">
                            <option value="">Select skill level</option>
                            <option value="developmental">Developmental</option>
                            <option value="developmental_plus">Developmental+</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="intermediate_plus">Intermediate+</option>
                            <option value="advanced">Advanced</option>
                          </select>
                          <input type="tel" placeholder="Phone (optional)" value={newPlayerForm.phone} onChange={e => setNewPlayerForm(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 text-sm border rounded bg-background" />
                          <Button className="w-full" size="sm" onClick={handleAddGuestPlayer}>Add Guest Member</Button>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Position requirements checklist */}
              <Card className="p-4 space-y-3 border-yellow-500/30 bg-yellow-500/5">
                <p className="text-sm font-medium">Team Position Requirements</p>
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
                              <span className={`text-sm font-medium ${met ? 'text-green-500' : 'text-yellow-500'}`}>{provided}/{req}</span>
                              {met ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-yellow-500" />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
                <p className="text-xs text-muted-foreground pt-2">Extra players beyond the minimum are allowed (bench players)</p>
              </Card>
            </div>
          </motion.div>
        )}

        {/* ── Section: Payment ── */}
        <motion.div
          initial={hasAnimated.current ? false : 'hidden'}
          animate="visible"
          variants={fadeUpVariants}
          custom={3}
          className="mb-6"
        >
          <div className="border border-border rounded-xl p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Payment</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPaymentChannelsModal(true)}
              className="gap-2"
            >
              <CreditCard size={16} />
              View Payment Channels ↗
            </Button>
            {paymentFile ? (
              <Card className="p-3 bg-muted/50 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm truncate">{paymentFile.name}</p>
                </div>
                <button onClick={handleRemovePaymentFile} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </Card>
            ) : (
              <label className="block">
                <div className="border border-dashed border-border rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition-colors text-center">
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium"><span className="text-primary">Click to upload</span> your payment screenshot</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                </div>
                <input type="file" accept="image/*" onChange={handlePaymentFileChange} className="hidden" />
              </label>
            )}
          </div>
        </motion.div>
      </main>

      {/* ── MOBILE: Fixed footer bar ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-[#0f172a] px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-slate-500">{scheduleCount} {scheduleCount === 1 ? 'game' : 'games'} selected</p>
          <p className="text-sm font-extrabold text-sky-400">₱{totalAmount.toFixed(0)}</p>
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
          size="sm"
        >
          {isSubmitting
            ? 'Registering...'
            : mode === 'solo'
              ? `Register → (${scheduleCount})`
              : `Register ${groupPlayers.length} →`}
        </Button>
      </div>

      {/* ── MOBILE: Cart modal (bottom sheet) ── */}
      <AnimatePresence>
        {cartModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-30 bg-black/60"
              onClick={() => setCartModalOpen(false)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white rounded-t-2xl max-h-[80vh] flex flex-col"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 rounded-full bg-muted" />
              </div>

              <div className="px-5 py-4 border-b border-border">
                <p className="text-lg font-extrabold text-slate-900">Your Games</p>
              </div>

              <div className="overflow-y-auto flex-1 px-5 space-y-3 pb-3">
                {/* Selected game rows */}
                {Object.entries(selectedSchedules).map(([id, slot], idx) => {
                  const isPrimary = idx === 0
                  const s = slot.schedule
                  return (
                    <div key={id} className="border border-border rounded-lg p-3 flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-extrabold text-slate-900">{s.locations?.name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatScheduleDateWithWeekday(s.start_time)} · {formatScheduleTime(s.start_time)}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-[14px] font-extrabold text-primary">
                          ₱{computeSoloAmount(
                            { position_prices: s.position_prices as Record<string, number>, team_price: s.team_price },
                            position
                          ).toFixed(0)}
                        </p>
                        {!isPrimary && (
                          <button
                            onClick={() => handleRemoveSchedule(id)}
                            className="text-[11px] text-destructive mt-1 cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Inline add-game expand inside modal */}
                <div className="border border-dashed border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => {
                      if (!availableLoaded) fetchAvailableSchedules()
                      setPanelOpen(!panelOpen)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {panelOpen ? 'Hide games' : '＋ Add another game'}
                  </button>

                  <AnimatePresence>
                    {panelOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border"
                      >
                        {availableLoading ? (
                          <div className="p-3 space-y-2">
                            {[...Array(2)].map((_, i) => (
                              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                            ))}
                          </div>
                        ) : availableSchedules.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground text-center py-4">No additional games available</p>
                        ) : (
                          <div>
                            {availableSchedules.map(s => (
                              <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border last:border-b-0">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate">{s.locations?.name}</p>
                                  <p className="text-xs text-slate-600">
                                    {formatScheduleDateWithWeekday(s.start_time)} · ₱{computeSoloAmount(
                                      { position_prices: s.position_prices as Record<string, number>, team_price: s.team_price },
                                      position
                                    ).toFixed(0)}
                                  </p>
                                </div>
                                <Button size="xs" onClick={() => { handleAddSchedule(s); setPanelOpen(false) }} className="shrink-0">
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

              {/* Total + Done */}
              <div className="px-5 py-4 border-t border-border space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-600 font-semibold">Total</p>
                  <p className="text-2xl font-black text-slate-900">₱{totalAmount.toFixed(0)}</p>
                </div>
                <Button className="w-full" onClick={() => setCartModalOpen(false)}>
                  Done
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
