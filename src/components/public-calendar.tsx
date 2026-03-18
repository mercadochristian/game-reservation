'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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

interface PublicCalendarProps {
  schedules: ScheduleWithLocation[]
}

export function PublicCalendar({ schedules }: PublicCalendarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState<Date>(() => getNowInManila())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Auth & data state
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({})
  const [positionCounts, setPositionCounts] = useState<Record<string, Record<string, number>>>({})
  const [countsLoading, setCountsLoading] = useState(true)
  const [userRegistrations, setUserRegistrations] = useState<Record<string, Registration>>({})

  // Modal state
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [positionModalOpen, setPositionModalOpen] = useState(false)
  const [activeSchedule, setActiveSchedule] = useState<ScheduleWithLocation | null>(null)
  const [activeRegistration, setActiveRegistration] = useState<Registration | null>(null)
  const [modalSchedule, setModalSchedule] = useState<ScheduleWithLocation | null>(null)
  const [modalPosition, setModalPosition] = useState<string | null>(null)
  const [loginScheduleId, setLoginScheduleId] = useState<string | undefined>()

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

  // Initialize selectedDate from URL param
  useEffect(() => {
    const dateParam = searchParams.get('date')
    if (dateParam) {
      setSelectedDate(dateParam)
    }
  }, [searchParams])

  // Auth check on mount & fetch user registrations
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (authError) {
        console.error('[PublicCalendar] Auth check failed:', authError)
        setUser(null)
        return
      }

      setUser((data.user as any) ?? null)

      // If user is logged in, fetch their registrations for current schedules
      if (data.user) {
        const scheduleIds = schedules.map((s) => s.id)
        if (scheduleIds.length > 0) {
          ;(supabase.from('registrations') as any)
            .select('*')
            .eq('player_id', data.user.id)
            .in('schedule_id', scheduleIds)
            .then(({ data: regs, error: regsError }: { data: any; error: any }) => {
              if (regsError) {
                console.error('[PublicCalendar] Failed to fetch user registrations:', regsError)
                // Non-fatal — user simply won't see their registered state
                return
              }
              const map: Record<string, Registration> = {}
              for (const reg of regs ?? []) {
                map[reg.schedule_id] = reg
              }
              setUserRegistrations(map)
            })
        }
      }
    })
  }, [schedules])

  // Fetch registration counts and position counts via service-client API (bypasses RLS)
  const fetchCounts = useCallback(async () => {
    if (schedules.length === 0) {
      setCountsLoading(false)
      return
    }

    const scheduleIds = schedules.map((s) => s.id).join(',')

    try {
      const res = await fetch(`/api/registrations/counts?schedule_ids=${scheduleIds}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { counts, positionCounts: posCounts } = await res.json()
      setRegistrationCounts(counts ?? {})
      setPositionCounts(posCounts ?? {})
    } catch (err) {
      console.error('[PublicCalendar] Failed to fetch registration counts:', err)
      toast.error('Could not load registration counts')
    } finally {
      setCountsLoading(false)
    }
  }, [schedules])

  // Fetch counts on mount and when schedules change
  useEffect(() => {
    setCountsLoading(true)
    void fetchCounts()
  }, [fetchCounts])

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
      <div className="pt-20 px-4 sm:px-6 max-w-4xl mx-auto">
        {/* Calendar Section Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Schedule</p>
        </div>

        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-semibold">{monthYear}</h2>
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
            className="rounded-2xl bg-card ring-1 ring-foreground/8 p-6 shadow-sm mb-8"
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
                      ${isSelected ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : ''}
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
                    className="rounded-2xl bg-card ring-1 ring-foreground/8 shadow-sm p-12 text-center"
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

                    const spotsBadgeVariant = isFull
                      ? 'destructive'
                      : spotsRemaining <= 6
                        ? 'secondary'
                        : 'default'

                    return (
                      <motion.div
                        key={schedule.id}
                        custom={index}
                        initial="hidden"
                        animate="visible"
                        variants={fadeUpVariants}
                      >
                        <div className="rounded-2xl bg-card ring-1 ring-foreground/8 shadow-sm overflow-hidden">
                          <div className="p-5 space-y-4">
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
                                        setModalSchedule(schedule)
                                        setModalPosition(pos.key)
                                        setPositionModalOpen(true)
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
                                    setActiveSchedule(schedule)
                                    setActiveRegistration(userRegistrations[schedule.id])
                                    setQrModalOpen(true)
                                  }}
                                >
                                  Show QR
                                </Button>
                              ) : (
                                <Button
                                  className="w-full"
                                  onClick={() => {
                                    if (!user) {
                                      setLoginScheduleId(schedule.id)
                                      setLoginModalOpen(true)
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
      </div>

      {/* Modals */}
      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        scheduleId={loginScheduleId}
      />
      <QRModal
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
        schedule={activeSchedule}
        registration={activeRegistration}
      />
      <PositionModal
        open={positionModalOpen}
        onOpenChange={setPositionModalOpen}
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
