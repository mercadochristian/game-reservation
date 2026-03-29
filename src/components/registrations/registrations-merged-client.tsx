'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/ui/page-header'
import { fadeUpVariants } from '@/lib/animations'
import { useHasAnimated } from '@/lib/hooks/useHasAnimated'
import { useSchedulesByLocation } from '@/lib/hooks/useSchedulesByLocation'
import { RegistrationsFilterBar } from './registrations-filter-bar'
import { UpcomingGamesSection } from './upcoming-games-section'
import { PastGamesSection } from './past-games-section'
import type { Location } from '@/types'

interface RegistrationsMergedClientProps {
  locations: Location[]
  userRole: 'admin' | 'facilitator' | 'player'
}

export function RegistrationsMergedClient({
  locations,
  userRole,
}: RegistrationsMergedClientProps) {
  const router = useRouter()
  const hasAnimated = useHasAnimated()

  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | 'last30' | 'last7'>('all')
  const [expandedScheduleIds, setExpandedScheduleIds] = useState<Set<string>>(new Set())
  const [isPastGamesExpanded, setIsPastGamesExpanded] = useState(false)
  const [upcomingPage, setUpcomingPage] = useState(1)
  const [pastPage, setPastPage] = useState(1)

  const { upcomingSchedules, pastSchedules, registrationsByScheduleId, loading } =
    useSchedulesByLocation(selectedLocationId)

  const PAGE_SIZE = 10

  const handleToggleGameExpand = useCallback((scheduleId: string) => {
    setExpandedScheduleIds((prev) => {
      const next = new Set(prev)
      if (next.has(scheduleId)) {
        next.delete(scheduleId)
      } else {
        next.add(scheduleId)
      }
      return next
    })
  }, [])

  const handleRegisterPlayer = useCallback((scheduleId: string) => {
    // Navigate to old single-game view with register dialog open
    // This uses the existing registration infrastructure temporarily
    router.push(`/dashboard/registrations?scheduleId=${scheduleId}&openRegister=true`)
  }, [router])

  const handleManageLineups = useCallback((scheduleId: string) => {
    router.push(`/dashboard/lineups/${scheduleId}`)
  }, [router])

  const totalRegistrations =
    Object.values(registrationsByScheduleId).reduce((sum, regs) => sum + regs.length, 0)

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8">
        <PageHeader
          breadcrumb="Registrations"
          title="Registrations"
          count={totalRegistrations}
          description="View and manage player registrations by location"
        />

        {/* Filter Bar */}
        <motion.div
          custom={0}
          initial={hasAnimated.current ? false : 'hidden'}
          animate="visible"
          variants={fadeUpVariants}
          className="mb-8"
        >
          <RegistrationsFilterBar
            locations={locations}
            selectedLocationId={selectedLocationId}
            selectedDateRange={selectedDateRange}
            totalRegistrations={totalRegistrations}
            onLocationChange={setSelectedLocationId}
            onDateRangeChange={setSelectedDateRange}
          />
        </motion.div>

        {/* Main Content */}
        {!selectedLocationId ? (
          <motion.div
            custom={1}
            initial={hasAnimated.current ? false : 'hidden'}
            animate="visible"
            variants={fadeUpVariants}
            className="bg-card border-border border rounded-lg p-12 text-center"
          >
            <p className="text-muted-foreground">Select a location to view games and registrations</p>
          </motion.div>
        ) : loading ? (
          <motion.div
            custom={1}
            initial={hasAnimated.current ? false : 'hidden'}
            animate="visible"
            variants={fadeUpVariants}
            className="bg-card border-border border rounded-lg p-12 text-center"
          >
            <p className="text-muted-foreground">Loading registrations...</p>
          </motion.div>
        ) : (
          <>
            {/* Upcoming Games Section */}
            <motion.div
              custom={1}
              initial={hasAnimated.current ? false : 'hidden'}
              animate="visible"
              variants={fadeUpVariants}
              className="mb-8"
            >
              <UpcomingGamesSection
                schedules={upcomingSchedules}
                registrationsByScheduleId={registrationsByScheduleId}
                expandedScheduleIds={expandedScheduleIds}
                onToggleExpand={handleToggleGameExpand}
                onRegisterPlayer={handleRegisterPlayer}
                onManageLineups={handleManageLineups}
                currentPage={upcomingPage}
                pageSize={PAGE_SIZE}
                onPageChange={setUpcomingPage}
              />
            </motion.div>

            {/* Past Games Section */}
            <motion.div
              custom={2}
              initial={hasAnimated.current ? false : 'hidden'}
              animate="visible"
              variants={fadeUpVariants}
            >
              <PastGamesSection
                schedules={pastSchedules}
                registrationsByScheduleId={registrationsByScheduleId}
                expandedScheduleIds={expandedScheduleIds}
                isExpanded={isPastGamesExpanded}
                onToggleSectionExpand={() => setIsPastGamesExpanded(!isPastGamesExpanded)}
                onToggleGameExpand={handleToggleGameExpand}
                currentPage={pastPage}
                pageSize={PAGE_SIZE}
                onPageChange={setPastPage}
              />
            </motion.div>
          </>
        )}
      </div>
  )
}
