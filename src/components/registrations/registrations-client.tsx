'use client'

import { useState, useCallback, useEffect } from 'react'
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

interface RegistrationsClientProps {
  readonly locations: Location[]
  readonly userRole: 'admin'
  readonly initialSearchParams?: Record<string, string | string[] | undefined>
}

export function RegistrationsClient({
  locations,
  userRole,
  initialSearchParams = {},
}: RegistrationsClientProps) {
  const router = useRouter()
  const hasAnimated = useHasAnimated()

  const [selectedLocationId, setSelectedLocationId] = useState(() => {
    const param = initialSearchParams?.locationId
    return typeof param === 'string' ? param : ''
  })
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | 'last30' | 'last7'>(() => {
    const param = initialSearchParams?.dateRange
    if (param === 'all' || param === 'last30' || param === 'last7') return param
    return 'all'
  })
  const [expandedScheduleIds, setExpandedScheduleIds] = useState<Set<string>>(() => {
    const param = initialSearchParams?.expanded
    if (typeof param === 'string' && param) {
      return new Set(param.split(',').filter(Boolean))
    }
    return new Set()
  })
  const [isPastGamesExpanded, setIsPastGamesExpanded] = useState(false)
  const [upcomingPage, setUpcomingPage] = useState(1)
  const [pastPage, setPastPage] = useState(1)

  const { upcomingSchedules, pastSchedules, registrationsByScheduleId, loading } =
    useSchedulesByLocation(selectedLocationId, selectedDateRange)

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
    // State is already synced to URL by useEffect, just add the registration params
    const params = new URLSearchParams()
    if (selectedLocationId) params.set('locationId', selectedLocationId)
    if (selectedDateRange !== 'all') params.set('dateRange', selectedDateRange)
    if (expandedScheduleIds.size > 0) {
      params.set('expanded', Array.from(expandedScheduleIds).join(','))
    }
    params.set('scheduleId', scheduleId)
    params.set('openRegister', 'true')
    router.push(`/dashboard/registrations?${params.toString()}`)
  }, [router, selectedLocationId, selectedDateRange, expandedScheduleIds])

  const handleManageLineups = useCallback((scheduleId: string) => {
    // Add return URL params so we can restore state when coming back
    const params = new URLSearchParams()
    if (selectedLocationId) params.set('locationId', selectedLocationId)
    if (selectedDateRange !== 'all') params.set('dateRange', selectedDateRange)
    if (expandedScheduleIds.size > 0) {
      params.set('expanded', Array.from(expandedScheduleIds).join(','))
    }
    router.push(`/dashboard/lineups/${scheduleId}?${params.toString()}`)
  }, [router, selectedLocationId, selectedDateRange, expandedScheduleIds])

  // Sync state to URL whenever filters change (use replace to avoid polluting history)
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedLocationId) params.set('locationId', selectedLocationId)
    if (selectedDateRange !== 'all') params.set('dateRange', selectedDateRange)
    if (expandedScheduleIds.size > 0) {
      params.set('expanded', Array.from(expandedScheduleIds).join(','))
    }
    const queryString = params.toString()
    router.replace(`/dashboard/registrations${queryString ? '?' + queryString : ''}`)
  }, [selectedLocationId, selectedDateRange, expandedScheduleIds, router])

  const totalRegistrations =
    Object.values(registrationsByScheduleId).reduce((sum, regs) => sum + regs.length, 0)

  const loadingContent = (
    <motion.div
      custom={1}
      initial={hasAnimated.current ? false : 'hidden'}
      animate="visible"
      variants={fadeUpVariants}
      className="bg-card border-border border rounded-lg p-12 text-center"
    >
      <p className="text-muted-foreground">Loading registrations...</p>
    </motion.div>
  )

  const noLocationContent = (
    <motion.div
      custom={1}
      initial={hasAnimated.current ? false : 'hidden'}
      animate="visible"
      variants={fadeUpVariants}
      className="bg-card border-border border rounded-lg p-12 text-center"
    >
      <p className="text-muted-foreground">Select a location to view games and registrations</p>
    </motion.div>
  )

  const gamesContent = (
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
          onRegisterPlayer={() => {}}
          onManageLineups={() => {}}
          currentPage={pastPage}
          pageSize={PAGE_SIZE}
          onPageChange={setPastPage}
        />
      </motion.div>
    </>
  )

  const contentWhenLocationSelected = loading ? loadingContent : gamesContent
  const mainContent = selectedLocationId ? contentWhenLocationSelected : noLocationContent

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
      {mainContent}
    </div>
  )
}
