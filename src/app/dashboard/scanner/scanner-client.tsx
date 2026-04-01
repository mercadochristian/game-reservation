'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getTodayManilaKey } from '@/lib/utils/timezone'
import { useSchedulePlayers } from '@/lib/hooks/useSchedulePlayers'
import { ScannerFilterBar } from './scanner-filter-bar'
import { ScheduleSelector } from './schedule-selector'
import { ScanZone } from './scan-zone'
import { ScanResultCard } from './scan-result-card'
import { PlayerRoster } from './player-roster'
import type { Location } from '@/types'

interface ScannerClientProps {
  initialLocations: Location[]
  initialSchedules: any[]
}

type ScanResult = any

export function ScannerClient({ initialLocations, initialSchedules }: ScannerClientProps) {
  const router = useRouter()
  const todayKey = getTodayManilaKey()
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<'date' | 'date-custom'>('date')
  const [selectedDate, setSelectedDate] = useState<string | null>(todayKey)
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [schedules, setSchedules] = useState<any[]>(initialSchedules || [])
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [schedulesError, setSchedulesError] = useState<string | null>(null)

  // Fetch schedules when location or date changes
  useEffect(() => {
    const fetchSchedules = async () => {
      // If no location selected and showing today, use initial schedules
      if (!selectedLocationId && selectedDateRange === 'date') {
        setSchedules(initialSchedules || [])
        setSchedulesError(null)
        return
      }

      setSchedulesLoading(true)
      setSchedulesError(null)

      try {
        const dateRangeParam = selectedDateRange === 'date' ? `date:${todayKey}` : `date:${selectedDate || todayKey}`

        const params = new URLSearchParams({
          dateRange: dateRangeParam,
        })

        if (selectedLocationId) {
          params.set('locationId', selectedLocationId)
        }

        const response = await fetch(`/api/scanner/schedules?${params}`)

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          setSchedulesError(data.error || 'Failed to load schedules')
          setSchedules([])
          return
        }

        const result = await response.json()
        setSchedules(result || [])
        setSchedulesError(null)
      } catch (err) {
        setSchedulesError(err instanceof Error ? err.message : 'Failed to load schedules')
        setSchedules([])
      } finally {
        setSchedulesLoading(false)
      }
    }

    fetchSchedules()
  }, [selectedLocationId, selectedDateRange, selectedDate, todayKey, initialSchedules])

  const { attended, pending, isLoading: playersLoading, refresh: refreshPlayers } = useSchedulePlayers(selectedScheduleId)

  // Sync URL state
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedLocationId) params.set('location', selectedLocationId)
    if (selectedDateRange) params.set('dateRange', selectedDateRange)
    if (selectedDate && selectedDateRange === 'date') params.set('date', selectedDate)
    if (selectedScheduleId) params.set('schedule', selectedScheduleId)

    const newUrl = params.toString() ? `?${params}` : ''
    router.push(newUrl || '.', { scroll: false })
  }, [selectedLocationId, selectedDateRange, selectedDate, selectedScheduleId, router])

  const handleDateRangeChange = (range: 'date' | 'date-custom') => {
    setSelectedDateRange(range)
    setSelectedDate(getTodayManilaKey())
  }

  const handleScanSuccess = async (result: ScanResult) => {
    setScanResult(result)
    await refreshPlayers()
  }

  const handlePaymentBlocked = (payload: any) => {
    setScanResult(payload)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">QR Scanner</h1>
        <p className="text-base text-muted-foreground mt-1">Mark attendance for today's game</p>
      </div>

      {/* Filter Bar */}
      <ScannerFilterBar
        locations={initialLocations}
        selectedLocationId={selectedLocationId}
        selectedDateRange={selectedDateRange}
        selectedDate={selectedDate}
        onLocationChange={setSelectedLocationId}
        onDateRangeChange={handleDateRangeChange}
        onDateChange={setSelectedDate}
      />

      {/* Schedule Selector */}
      <ScheduleSelector
        schedules={schedules}
        selectedScheduleId={selectedScheduleId}
        onSelectSchedule={setSelectedScheduleId}
        isLoading={schedulesLoading}
        error={schedulesError}
      />

      {/* Scan Zone */}
      {selectedScheduleId && (
        <ScanZone
          scheduleId={selectedScheduleId}
          onScanSuccess={handleScanSuccess}
          onPaymentBlocked={handlePaymentBlocked}
          isScanning={isScanning}
        />
      )}

      {/* Scan Result */}
      {scanResult && <ScanResultCard result={scanResult} />}

      {/* Player Roster */}
      {selectedScheduleId && (
        <PlayerRoster
          attended={attended}
          pending={pending}
          isLoading={playersLoading}
        />
      )}
    </div>
  )
}
