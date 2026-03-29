'use client'

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { useHasAnimated } from '@/lib/hooks/useHasAnimated'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, CalendarX } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { type ScheduleWithLocation, type User, type Registration } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoginModal } from '@/components/login-modal'
import { QRModal } from '@/components/qr-modal'
import { PositionModal } from '@/components/position-modal'
import { ScheduleInfo } from '@/components/schedule-info'
import { fadeUpVariants } from '@/lib/animations'
import { SKILL_LEVEL_LABELS } from '@/lib/constants/labels'
import {
  getNowInManila,
  toManilaDateKey,
  getTodayManilaKey,
} from '@/lib/utils/timezone'
import { POSITION_SLOTS, getPositionAvailable, getPositionTotal } from '@/lib/utils/position-slots'

// --- Calendar state reducer ---
interface CalendarState {
  user: User | null | undefined
  registrationCounts: Record<string, number>
  positionCounts: Record<string, Record<string, number>>
  countsLoading: boolean
  userRegistrations: Record<string, Registration>
  loginModalOpen: boolean
  qrModalOpen: boolean
  positionModalOpen: boolean
  activeSchedule: ScheduleWithLocation | null
  activeRegistration: Registration | null
  modalSchedule: ScheduleWithLocation | null
  modalPosition: string | null
  loginScheduleId: string | undefined
}

const initialCalendarState: CalendarState = {
  user: undefined,
  registrationCounts: {},
  positionCounts: {},
  countsLoading: true,
  userRegistrations: {},
  loginModalOpen: false,
  qrModalOpen: false,
  positionModalOpen: false,
  activeSchedule: null,
  activeRegistration: null,
  modalSchedule: null,
  modalPosition: null,
  loginScheduleId: undefined,
}

type CalendarAction =
  | { type: 'SET_USER'; user: User | null }
  | { type: 'SET_COUNTS'; counts: Record<string, number>; positionCounts: Record<string, Record<string, number>> }
  | { type: 'SET_COUNTS_LOADING'; loading: boolean }
  | { type: 'SET_USER_REGISTRATIONS'; registrations: Record<string, Registration> }
  | { type: 'OPEN_LOGIN'; scheduleId: string }
  | { type: 'CLOSE_LOGIN' }
  | { type: 'OPEN_QR'; schedule: ScheduleWithLocation; registration: Registration }
  | { type: 'CLOSE_QR' }
  | { type: 'OPEN_POSITION'; schedule: ScheduleWithLocation; position: string }
  | { type: 'CLOSE_POSITION' }

function calendarReducer(state: CalendarState, action: CalendarAction): CalendarState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.user }
    case 'SET_COUNTS':
      return { ...state, registrationCounts: action.counts, positionCounts: action.positionCounts, countsLoading: false }
    case 'SET_COUNTS_LOADING':
      return { ...state, countsLoading: action.loading }
    case 'SET_USER_REGISTRATIONS':
      return { ...state, userRegistrations: action.registrations }
    case 'OPEN_LOGIN':
      return { ...state, loginModalOpen: true, loginScheduleId: action.scheduleId }
    case 'CLOSE_LOGIN':
      return { ...state, loginModalOpen: false }
    case 'OPEN_QR':
      return { ...state, qrModalOpen: true, activeSchedule: action.schedule, activeRegistration: action.registration }
    case 'CLOSE_QR':
      return { ...state, qrModalOpen: false }
    case 'OPEN_POSITION':
      return { ...state, positionModalOpen: true, modalSchedule: action.schedule, modalPosition: action.position }
    case 'CLOSE_POSITION':
      return { ...state, positionModalOpen: false }
    default:
      return state
  }
}

interface PublicCalendarProps {
  schedules: ScheduleWithLocation[]
}

export function PublicCalendar({ schedules }: PublicCalendarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasAnimated = useHasAnimated()

  // Calendar state (kept separate — these are navigation-only)
  const [currentMonth, setCurrentMonth] = useState<Date>(() => getNowInManila())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Auth, data, and modal state (consolidated via useReducer)
  const [calState, calDispatch] = useReducer(calendarReducer, initialCalendarState)
  const { user, registrationCounts, positionCounts, countsLoading, userRegistrations, loginModalOpen, qrModalOpen, positionModalOpen, activeSchedule, activeRegistration, modalSchedule, modalPosition, loginScheduleId } = calState

  // Group schedules by Manila date string
  const schedulesByDate = useMemo(() => {
    const map: Record<string, ScheduleWithLocation[]> = {}
    for (const schedule of schedules) {
      const dateKey = toManilaDateKey(schedule.start_time) // 'YYYY-MM-DD'
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(schedule)
    }
    return map
  }, [schedules])

  // Get upcoming schedules for the empty state
  const upcomingSchedules = useMemo(() => {
    const now = getNowInManila()
    return schedules
      .filter(s => new Date(s.start_time) > now && (s.status === 'open' || s.status === 'full'))
      .slice(0, 4)
  }, [schedules])

  // Initialize selectedDate from URL param
  useEffect(() => {
    const dateParam = searchParams.get('date')
    if (dateParam) {
      setSelectedDate(dateParam)
    }
  }, [searchParams])

  // Fetch registration counts and position counts via service-client API (bypasses RLS)
  const fetchCounts = useCallback(async (signal?: AbortSignal) => {
    if (schedules.length === 0) {
      calDispatch({ type: 'SET_COUNTS_LOADING', loading: false })
      return
    }

    const scheduleIds = schedules.map((s) => s.id).join(',')

    try {
      const res = await fetch(`/api/registrations/counts?schedule_ids=${scheduleIds}`, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { counts, positionCounts: posCounts } = await res.json()
      calDispatch({ type: 'SET_COUNTS', counts: counts ?? {}, positionCounts: posCounts ?? {} })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      console.error('[PublicCalendar] Failed to fetch registration counts:', err)
      toast.error('Could not load registration counts')
      calDispatch({ type: 'SET_COUNTS_LOADING', loading: false })
    }
  }, [schedules])

  // Parallel fetch: auth check + registration counts on mount
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const supabase = createClient()

    calDispatch({ type: 'SET_COUNTS_LOADING', loading: true })

    const authPromise = supabase.auth.getUser().then(({ data, error: authError }) => {
      if (cancelled) return
      if (authError) {
        console.error('[PublicCalendar] Auth check failed:', authError)
        calDispatch({ type: 'SET_USER', user: null })
        return
      }

      calDispatch({ type: 'SET_USER', user: (data.user as any) ?? null })

      // If user is logged in, fetch their registrations for current schedules
      if (data.user) {
        const scheduleIds = schedules.map((s) => s.id)
        if (scheduleIds.length > 0) {
          return (supabase.from('registrations') as any)
            .select('*')
            .eq('player_id', data.user.id)
            .in('schedule_id', scheduleIds)
            .then(({ data: regs, error: regsError }: { data: any; error: any }) => {
              if (cancelled) return
              if (regsError) {
                console.error('[PublicCalendar] Failed to fetch user registrations:', regsError)
                return
              }
              const map: Record<string, Registration> = {}
              for (const reg of regs ?? []) {
                map[reg.schedule_id] = reg
              }
              calDispatch({ type: 'SET_USER_REGISTRATIONS', registrations: map })
            })
        }
      }
    })

    const countsPromise = fetchCounts(controller.signal)

    void Promise.all([authPromise, countsPromise])

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [schedules, fetchCounts])

  // Subscribe to real-time registration changes and refetch via API
  useEffect(() => {
    if (schedules.length === 0) return

    const supabase = createClient()
    const channel = supabase
      .channel('registrations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registrations' },
        () => { void fetchCounts() }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [schedules, fetchCounts])

  // Auto-navigate for ?schedule=<id> param after magic link login
  useEffect(() => {
    const scheduleId = searchParams.get('schedule')
    if (!scheduleId || user === undefined || !user) return

    const schedule = schedules.find((s) => s.id === scheduleId)
    if (schedule) {
      // Navigate to register page with the schedule ID and current selected date
      router.push(`/register/${scheduleId}?date=${selectedDate || ''}`)

      // Clean up the URL query param
      const url = new URL(globalThis.location.href)
      url.searchParams.delete('schedule')
      globalThis.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, user, schedules, selectedDate, router])

  // Calendar navigation
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const [monthDirection, setMonthDirection] = useState<-1 | 1>(1)
  const prevMonth = () => {
    setMonthDirection(-1)
    setCurrentMonth(new Date(year, month - 1, 1))
  }
  const nextMonth = () => {
    setMonthDirection(1)
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  // Calendar grid calculation
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Today's date in Manila timezone
  const todayKey = getTodayManilaKey()

  // Month and year display
  const monthYear = new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })


  // Day of week labels
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Calendar days array
  const calendarDays = []
  // Add empty cells for days before the 1st
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }
  // Add actual days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  return (
    <>
      <section className="py-16 px-4 sm:px-6 bg-background" id="schedule">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-12">All Games</h2>

          {/* Calendar Section Header */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase border-l-2 border-primary pl-3">Schedule</p>
          </div>

        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">{monthYear}</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-full">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`calendar-${year}-${month}`}
            initial={{ opacity: 0, x: monthDirection * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: monthDirection * -20 }}
            transition={{ duration: 0.25 }}
            className="border border-border rounded-lg bg-background p-6 mb-8"
          >
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-3 mb-6">
              {dayLabels.map((label) => (
                <div key={label} className="text-center text-xs font-medium text-foreground/60 tracking-widest uppercase py-2">
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-3">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} />
                }

                const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const hasSchedule = !!schedulesByDate[dateKey]
                const isSelected = selectedDate === dateKey
                const isToday = dateKey === todayKey

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateKey)}
                    className={`
                      relative h-10 w-10 rounded-full transition-all flex items-center justify-center cursor-pointer
                      ${!hasSchedule ? 'text-muted-foreground hover:bg-muted/50' : 'text-foreground hover:bg-muted'}
                      ${isSelected ? 'bg-primary text-primary-foreground font-semibold' : ''}
                      ${isToday && !isSelected ? 'ring-2 ring-primary/40 font-semibold' : ''}
                    `}
                  >
                    <span className="text-sm">{day}</span>
                    {hasSchedule && !isSelected && (
                      <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Schedule Cards */}
        <AnimatePresence mode="wait">
          {selectedDate && (
            <motion.div
              key={`schedules-${selectedDate}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div>
                <p className="text-sm font-semibold text-foreground mb-6 uppercase tracking-widest">
                  Games on{' '}
                  {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>

                {!schedulesByDate[selectedDate] || schedulesByDate[selectedDate].length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.25 }}
                    className="border border-border rounded-lg bg-background p-12 text-center"
                  >
                    <CalendarX className="mx-auto h-8 w-8 mb-3 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-foreground">No games scheduled for this day</p>
                    <p className="text-xs text-muted-foreground mt-1">Check back soon or pick another date</p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                  {schedulesByDate[selectedDate].map((schedule, index) => {
                    const registrationCount = registrationCounts[schedule.id] ?? 0
                    const spotsRemaining = schedule.max_players - registrationCount
                    const isFull = spotsRemaining <= 0
                    const isPast = new Date(schedule.start_time) < new Date()

                    const spotsBadgeVariant = isFull
                      ? 'destructive'
                      : spotsRemaining <= 6
                        ? 'secondary'
                        : 'default'

                    return (
                      <motion.div
                        key={schedule.id}
                        custom={index}
                        initial={hasAnimated.current ? false : "hidden"}
                        animate="visible"
                        variants={fadeUpVariants}
                      >
                        <div className="border border-border rounded-lg bg-background overflow-hidden hover:bg-muted/50 transition-colors">
                          <div className="p-6 space-y-4">
                            <ScheduleInfo schedule={schedule} />

                            {/* Divider */}
                            <div className="border-t border-border/50" />

                            {/* Spots Available */}
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">Spots Available</p>
                              <Badge variant={spotsBadgeVariant}>
                                {isFull
                                  ? 'Full'
                                  : `${spotsRemaining} of ${schedule.max_players}`}
                              </Badge>
                            </div>

                            {/* Position Availability */}
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Position Availability
                              </p>
                              <div
                                className={`flex flex-wrap gap-1 ${
                                  countsLoading ? 'opacity-50 pointer-events-none' : ''
                                }`}
                              >
                                {POSITION_SLOTS.map((pos) => {
                                  const total = getPositionTotal(pos.key, schedule.num_teams)
                                  const registered = positionCounts[schedule.id]?.[pos.key] ?? 0
                                  const available = getPositionAvailable(pos.key, schedule.num_teams, registered)
                                  const isFull = available <= 0
                                  const badgeVariant = isFull
                                    ? 'destructive'
                                    : available <= 2
                                      ? 'secondary'
                                      : 'outline'

                                  return (
                                    <button
                                      key={pos.key}
                                      onClick={() => {
                                        calDispatch({ type: 'OPEN_POSITION', schedule, position: pos.key })
                                      }}
                                      className="cursor-pointer transition-opacity hover:opacity-80 rounded"
                                    >
                                      <Badge
                                        variant={badgeVariant}
                                        className="text-xs pointer-events-none"
                                      >
                                        {pos.label} ·{' '}
                                        {isFull ? 'Full' : `${available}/${total}`}
                                      </Badge>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Skill Levels */}
                            {schedule.required_levels && schedule.required_levels.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  Required Skill Levels
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {schedule.required_levels.map((level) => (
                                    <Badge
                                      key={level}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {SKILL_LEVEL_LABELS[level] || level}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Button - Register or Show QR */}
                            <div className="pt-2">
                              {userRegistrations[schedule.id] ? (
                                <Button
                                  className="w-full"
                                  variant="secondary"
                                  onClick={() => {
                                    calDispatch({ type: 'OPEN_QR', schedule, registration: userRegistrations[schedule.id] })
                                  }}
                                >
                                  Show QR
                                </Button>
                              ) : isPast ? null : (
                                <Button
                                  className="w-full"
                                  onClick={() => {
                                    if (!user) {
                                      calDispatch({ type: 'OPEN_LOGIN', scheduleId: schedule.id })
                                    } else {
                                      router.push(`/register/${schedule.id}?date=${selectedDate}`)
                                    }
                                  }}
                                  disabled={isFull || countsLoading}
                                >
                                  {countsLoading ? 'Loading...' : isFull ? 'Full' : 'Register'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State — No Date Selected */}
        {!selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {upcomingSchedules.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-4">
                  Upcoming Games
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {upcomingSchedules.map((schedule, index) => (
                    <motion.button
                      key={schedule.id}
                      custom={index}
                      initial="hidden"
                      animate="visible"
                      variants={fadeUpVariants}
                      onClick={() => setSelectedDate(toManilaDateKey(schedule.start_time))}
                      className="text-left border border-border rounded-lg bg-background p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <p className="text-xs text-muted-foreground">
                        {new Date(schedule.start_time).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          timeZone: 'Asia/Manila',
                        })}
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-0.5 truncate">
                        {schedule.locations?.name}
                      </p>
                      <Badge
                        variant={schedule.status === 'full' ? 'secondary' : 'default'}
                        className="mt-2 text-xs capitalize"
                      >
                        {schedule.status}
                      </Badge>
                    </motion.button>
                  ))}
                </div>
                <p className="text-xs text-center text-muted-foreground/60 mt-6">
                  Select a highlighted date on the calendar to see all games
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarX className="mx-auto h-8 w-8 mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">No upcoming games scheduled</p>
                <p className="text-xs text-muted-foreground mt-1">Check back soon for new dates</p>
              </div>
            )}
          </motion.div>
        )}
        </div>
      </section>

      {/* Modals */}
      <LoginModal
        open={loginModalOpen}
        onOpenChange={(open) => { if (!open) calDispatch({ type: 'CLOSE_LOGIN' }) }}
        scheduleId={loginScheduleId}
      />
      <QRModal
        open={qrModalOpen}
        onOpenChange={(open) => { if (!open) calDispatch({ type: 'CLOSE_QR' }) }}
        schedule={activeSchedule}
        registration={activeRegistration}
      />
      <PositionModal
        open={positionModalOpen}
        onOpenChange={(open) => { if (!open) calDispatch({ type: 'CLOSE_POSITION' }) }}
        schedule={modalSchedule}
        position={modalPosition}
        totalSlots={
          modalSchedule && modalPosition
            ? getPositionTotal(modalPosition, modalSchedule.num_teams)
            : 0
        }
        registeredCount={
          modalSchedule && modalPosition
            ? positionCounts[modalSchedule.id]?.[modalPosition] ?? 0
            : 0
        }
      />
    </>
  )
}
