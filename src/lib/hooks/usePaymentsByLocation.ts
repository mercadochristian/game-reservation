'use client'

import { useState, useEffect } from 'react'
import type { ScheduleWithPaymentSummary } from '@/app/api/admin/payments/schedules/route'

interface UsePaymentsByLocationResult {
  schedules: ScheduleWithPaymentSummary[]
  isLoading: boolean
  error: string | null
}

export function usePaymentsByLocation(
  locationId: string | null,
  dateRange: string
): UsePaymentsByLocationResult {
  const [schedules, setSchedules] = useState<ScheduleWithPaymentSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!locationId) {
      setSchedules([])
      setError(null)
      return
    }

    const fetchSchedules = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          locationId,
          dateRange,
        })

        const response = await fetch(`/api/admin/payments/schedules?${params}`)

        if (!response.ok) {
          throw new Error('Failed to fetch payment schedules')
        }

        const data = await response.json()
        setSchedules(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setSchedules([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchSchedules()
  }, [locationId, dateRange])

  return { schedules, isLoading, error }
}
