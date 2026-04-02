'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { ScheduleWithLocation, Registration } from '@/types'
import { getPlayerRegistrations } from '@/lib/queries/registrations'
import { RegisteredGameCard } from '@/components/registered-game-card'
import { QRModal } from '@/components/qr-modal'
import { fadeUpVariants } from '@/lib/animations'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const PAGE_SIZE = 20

type RegistrationEntry = {
  schedule: ScheduleWithLocation
  registration: Registration
}

export function MyRegistrationsClient() {
  const [userId, setUserId] = useState<string | null>(null)
  const [upcoming, setUpcoming] = useState<RegistrationEntry[]>([])
  const [past, setPast] = useState<RegistrationEntry[]>([])
  const [upcomingPage, setUpcomingPage] = useState(0)
  const [pastPage, setPastPage] = useState(0)
  const [hasMoreUpcoming, setHasMoreUpcoming] = useState(false)
  const [hasMorePast, setHasMorePast] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingPast, setLoadingPast] = useState(false)
  const [showPast, setShowPast] = useState(false)
  const [pastFetched, setPastFetched] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [activeSchedule, setActiveSchedule] = useState<ScheduleWithLocation | null>(null)
  const [activeRegistration, setActiveRegistration] = useState<Registration | null>(null)

  const fetchUpcoming = useCallback(async (uid: string, page: number) => {
    const supabase = createClient()
    const { data, error } = await getPlayerRegistrations(supabase, uid, 'upcoming', page, PAGE_SIZE)

    if (error) {
      toast.error('Failed to load your registrations')
      return
    }

    const entries: RegistrationEntry[] = (data ?? []).map((row: Record<string, unknown>) => {
      const { registrations: regs, ...schedule } = row
      return {
        schedule: schedule as ScheduleWithLocation,
        registration: (regs as Registration[])[0],
      }
    })

    setUpcoming(prev => page === 0 ? entries : [...prev, ...entries])
    setHasMoreUpcoming(entries.length === PAGE_SIZE)
  }, [])

  const fetchPast = useCallback(async (uid: string, page: number) => {
    const supabase = createClient()
    const { data, error } = await getPlayerRegistrations(supabase, uid, 'past', page, PAGE_SIZE)

    if (error) {
      toast.error('Failed to load past games')
      return
    }

    const entries: RegistrationEntry[] = (data ?? []).map((row: Record<string, unknown>) => {
      const { registrations: regs, ...schedule } = row
      return {
        schedule: schedule as ScheduleWithLocation,
        registration: (regs as Registration[])[0],
      }
    })

    setPast(prev => page === 0 ? entries : [...prev, ...entries])
    setHasMorePast(entries.length === PAGE_SIZE)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const init = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (cancelled) return
      if (error || !data.user) {
        setLoading(false)
        return
      }
      setUserId(data.user.id)
      await fetchUpcoming(data.user.id, 0)
      if (!cancelled) setLoading(false)
    }

    void init()
    return () => { cancelled = true }
  }, [fetchUpcoming])

  const handleTogglePast = async () => {
    const next = !showPast
    setShowPast(next)
    if (next && !pastFetched && userId) {
      setLoadingPast(true)
      await fetchPast(userId, 0)
      setPastFetched(true)
      setLoadingPast(false)
    }
  }

  const handleLoadMore = async () => {
    if (!userId) return
    if (showPast) {
      const nextPage = pastPage + 1
      setPastPage(nextPage)
      await fetchPast(userId, nextPage)
    } else {
      const nextPage = upcomingPage + 1
      setUpcomingPage(nextPage)
      await fetchUpcoming(userId, nextPage)
    }
  }

  if (loading) {
    return (
      <section className="py-16 px-4 sm:px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <p className="text-muted-foreground">Loading your registrations...</p>
        </div>
      </section>
    )
  }

  const activeList = showPast ? past : upcoming
  const hasMore = showPast ? hasMorePast : hasMoreUpcoming
  const emptyMessage = showPast ? 'No past games.' : 'No upcoming games.'

  let content: ReactNode
  if (loadingPast) {
    content = <p className="text-muted-foreground">Loading past games...</p>
  } else if (activeList.length > 0) {
    content = (
      <>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
          }}
          initial="hidden"
          animate="visible"
        >
          {activeList.map((entry, index) => (
            <motion.div
              key={`${entry.schedule.id}-${entry.registration.id}`}
              custom={index}
              variants={fadeUpVariants}
              data-testid="registered-game-card"
            >
              <RegisteredGameCard
                schedule={entry.schedule}
                registration={entry.registration}
                onShowQR={(schedule, registration) => {
                  setActiveSchedule(schedule)
                  setActiveRegistration(registration)
                  setQrModalOpen(true)
                }}
                isPastGame={showPast}
              />
            </motion.div>
          ))}
        </motion.div>

        {hasMore && (
          <div className="mt-8 text-center">
            <Button variant="outline" size="sm" onClick={handleLoadMore}>
              Load More
            </Button>
          </div>
        )}
      </>
    )
  } else {
    content = (
      <motion.div
        custom={0}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUpVariants}
        className="text-center py-12"
      >
        <p className="text-muted-foreground">{emptyMessage}</p>
      </motion.div>
    )
  }

  return (
    <>
      <section className="py-16 px-4 sm:px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          {/* Header row */}
          <motion.div
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            className="flex items-center justify-between mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              {showPast ? 'Past Games' : 'Upcoming Games'}
            </h2>
            <Button variant="outline" size="sm" onClick={handleTogglePast}>
              {showPast ? 'Upcoming Games' : 'Past Games'}
            </Button>
          </motion.div>

          {/* Content */}
          {content}
        </div>
      </section>

      <QRModal
        open={qrModalOpen}
        onOpenChange={(open) => {
          if (!open) setQrModalOpen(false)
        }}
        schedule={activeSchedule}
        registration={activeRegistration}
      />
    </>
  )
}
