'use client'

import { useEffect, useState } from 'react'
import type { ScheduleWithSlots, RegistrationWithDetails } from '@/types'

interface UseSchedulesByLocationResult {
  upcomingSchedules: ScheduleWithSlots[]
  pastSchedules: ScheduleWithSlots[]
  registrationsByScheduleId: Record<string, RegistrationWithDetails[]>
  loading: boolean
  error?: string
}

export function useSchedulesByLocation(locationId: string): UseSchedulesByLocationResult {
  const [upcomingSchedules, setUpcomingSchedules] = useState<ScheduleWithSlots[]>([])
  const [pastSchedules, setPastSchedules] = useState<ScheduleWithSlots[]>([])
  const [registrationsByScheduleId, setRegistrationsByScheduleId] = useState<
    Record<string, RegistrationWithDetails[]>
  >({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    if (!locationId) {
      setUpcomingSchedules([])
      setPastSchedules([])
      setRegistrationsByScheduleId({})
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(undefined)
      try {
        const res = await fetch(`/api/admin/registrations?locationId=${locationId}`)
        if (!res.ok) throw new Error('Failed to fetch schedules')

        const data = await res.json()
        const now = new Date()

        const upcoming = (data.schedules || []).filter(
          (s: ScheduleWithSlots) => new Date(s.start_time) >= now
        )
        const past = (data.schedules || []).filter(
          (s: ScheduleWithSlots) => new Date(s.start_time) < now
        )

        setUpcomingSchedules(
          upcoming.sort((a: any, b: any) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          )
        )
        setPastSchedules(
          past.sort((a: any, b: any) =>
            new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
          )
        )

        const regMap: Record<string, RegistrationWithDetails[]> = {}
        if (data.registrations) {
          data.registrations.forEach((reg: RegistrationWithDetails) => {
            if (!regMap[reg.schedule_id]) {
              regMap[reg.schedule_id] = []
            }
            regMap[reg.schedule_id].push(reg)
          })
        }
        setRegistrationsByScheduleId(regMap)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [locationId])

  return {
    upcomingSchedules,
    pastSchedules,
    registrationsByScheduleId,
    loading,
    error,
  }
}
