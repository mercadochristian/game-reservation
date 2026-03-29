'use client'

import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { ScheduleWithLocation, Registration } from '@/types'
import { RegisteredGameCard } from '@/components/registered-game-card'
import { QRModal } from '@/components/qr-modal'
import { fadeUpVariants } from '@/lib/animations'
import { getNowInManila } from '@/lib/utils/timezone'
import { toast } from 'sonner'

interface RegisteredGamesSectionState {
  userId: string | null | undefined
  registrations: (Registration & { schedules: ScheduleWithLocation })[]
  loading: boolean
  qrModalOpen: boolean
  activeSchedule: ScheduleWithLocation | null
  activeRegistration: Registration | null
}

type RegisteredGamesAction =
  | { type: 'SET_USER'; userId: string | null }
  | { type: 'SET_REGISTRATIONS'; registrations: (Registration & { schedules: ScheduleWithLocation })[] }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'OPEN_QR'; schedule: ScheduleWithLocation; registration: Registration }
  | { type: 'CLOSE_QR' }

const initialState: RegisteredGamesSectionState = {
  userId: undefined,
  registrations: [],
  loading: true,
  qrModalOpen: false,
  activeSchedule: null,
  activeRegistration: null,
}

function registeredGamesReducer(state: RegisteredGamesSectionState, action: RegisteredGamesAction): RegisteredGamesSectionState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, userId: action.userId }
    case 'SET_REGISTRATIONS':
      return { ...state, registrations: action.registrations, loading: false }
    case 'SET_LOADING':
      return { ...state, loading: action.loading }
    case 'OPEN_QR':
      return { ...state, qrModalOpen: true, activeSchedule: action.schedule, activeRegistration: action.registration }
    case 'CLOSE_QR':
      return { ...state, qrModalOpen: false }
    default:
      return state
  }
}

interface RegisteredGamesSectionProps {
  includePastGames?: boolean
}

export function RegisteredGamesSection({ includePastGames = false }: RegisteredGamesSectionProps) {
  const [state, dispatch] = useReducer(registeredGamesReducer, initialState)
  const { userId, registrations, loading, qrModalOpen, activeSchedule, activeRegistration } = state

  // Fetch registrations when user is authenticated
  const fetchRegistrations = useCallback(async (userId: string) => {
    const supabase = createClient()
    dispatch({ type: 'SET_LOADING', loading: true })

    try {
      const { data, error } = await supabase
        .from('registrations')
        .select(`
          *,
          schedules:schedule_id(*, locations(*))
        `)
        .eq('player_id', userId) as {
          data: (Registration & { schedules: ScheduleWithLocation })[] | null
          error: any
        }

      if (error) {
        console.error('[RegisteredGamesSection] Failed to fetch registrations for user:', {
          userId,
          error: error.message,
          code: error.code,
          timestamp: new Date().toISOString(),
        })
        toast.error('Failed to load your registrations')
        dispatch({ type: 'SET_LOADING', loading: false })
        return
      }

      const now = getNowInManila()
      const filtered = (data ?? []).filter((reg: Registration & { schedules: ScheduleWithLocation }) => {
        if (!reg.schedules?.start_time) return false
        const gameTime = new Date(reg.schedules.start_time)
        return includePastGames ? true : gameTime >= now
      })

      dispatch({ type: 'SET_REGISTRATIONS', registrations: filtered })
    } catch (err) {
      console.error('[RegisteredGamesSection] Error fetching registrations:', {
        userId,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        timestamp: new Date().toISOString(),
      })
      toast.error('Failed to load your registrations')
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [includePastGames])

  // Initialize: auth check + fetch registrations
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getUser()

      if (cancelled) return

      if (error || !data.user) {
        dispatch({ type: 'SET_USER', userId: null })
        return
      }

      dispatch({ type: 'SET_USER', userId: data.user.id })

      if (data.user) {
        await fetchRegistrations(data.user.id)
      }
    }

    void checkAuth()

    return () => {
      cancelled = true
    }
  }, [fetchRegistrations])

  // Real-time subscription for registration changes
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const channel = supabase
      .channel('user-registrations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registrations',
          filter: `player_id=eq.${userId}`,
        },
        () => {
          void fetchRegistrations(userId)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel).catch(err => {
        console.error('[RegisteredGamesSection] Failed to remove channel:', {
          userId,
          error: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        })
      })
    }
  }, [userId, fetchRegistrations])

  // Filter registrations based on current time (for real-time updates)
  const filteredRegistrations = useMemo(() => {
    if (includePastGames) return registrations
    const now = getNowInManila()
    return registrations.filter(reg => new Date(reg.schedules.start_time) >= now)
  }, [registrations, includePastGames])

  // Don't render for unauthenticated users
  if (userId === null) {
    return null
  }

  return (
    <>
      <section className="py-16 px-4 sm:px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          {/* Section heading */}
          <motion.div
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            className="mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Your Registered Games
            </h2>
          </motion.div>

          {/* Games grid or empty state */}
          {loading ? (
            <motion.div
              custom={0}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUpVariants}
              className="text-center py-12"
            >
              <p className="text-muted-foreground">Loading your registrations...</p>
            </motion.div>
          ) : filteredRegistrations.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1,
                  },
                },
              }}
              initial="hidden"
              animate="visible"
            >
              {filteredRegistrations.map((reg, index) => (
                <motion.div
                  key={reg.id}
                  custom={index}
                  variants={fadeUpVariants}
                  data-testid="registered-game-card"
                >
                  <RegisteredGameCard
                    schedule={reg.schedules}
                    registration={reg}
                    onShowQR={(schedule, registration) => {
                      dispatch({ type: 'OPEN_QR', schedule, registration })
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              custom={0}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUpVariants}
              className="text-center py-12"
            >
              <p className="text-muted-foreground">
                You haven't registered for any games yet.
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* QR Code Modal */}
      <QRModal
        open={qrModalOpen}
        onOpenChange={(open) => {
          if (!open) dispatch({ type: 'CLOSE_QR' })
        }}
        schedule={activeSchedule}
        registration={activeRegistration}
      />
    </>
  )
}
