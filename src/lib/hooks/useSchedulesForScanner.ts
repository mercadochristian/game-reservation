'use client'

import { useEffect, useState } from 'react'
import { getTodayManilaKey } from '@/lib/utils/timezone'

export interface ScannerSchedule {
  id: string
  start_time: string
  end_time: string
  status: string
  location_id: string
  max_players: number
  location: {
    id: string
    name: string
  }
  registered_count: number
  attended_count: number
}

interface UseSchedulesForScannerReturn {
  schedules: ScannerSchedule[]
  isLoading: boolean
  error: string | null
}

export function useSchedulesForScanner(
  locationId: string | null,
  dateRange: string = `date:${getTodayManilaKey()}`,
): UseSchedulesForScannerReturn {
  const [schedules, setSchedules] = useState<ScannerSchedule[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setError(null)

    const fetchSchedules = async () => {
      try {
        const params = new URLSearchParams({
          dateRange,
        })

        if (locationId) {
          params.set('locationId', locationId)
        }

        const response = await fetch(`/api/scanner/schedules?${params}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || `Failed to fetch schedules (${response.status})`)
        }

        const data = (await response.json()) as ScannerSchedule[]
        if (isMounted) {
          setSchedules(data)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch schedules')
          setSchedules([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchSchedules()

    return () => {
      isMounted = false
    }
  }, [locationId, dateRange])

  return { schedules, isLoading, error }
}
