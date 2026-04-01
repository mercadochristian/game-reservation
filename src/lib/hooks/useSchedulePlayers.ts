'use client'

import { useEffect, useState, useCallback } from 'react'

export interface PlayerInfo {
  registration_id: string
  player: {
    id: string
    first_name: string | null
    last_name: string | null
  }
  payment_status: string
}

export interface PlayersResponse {
  attended: PlayerInfo[]
  pending: PlayerInfo[]
}

interface UseSchedulePlayersReturn extends PlayersResponse {
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useSchedulePlayers(
  scheduleId: string | null,
): UseSchedulePlayersReturn {
  const [data, setData] = useState<PlayersResponse>({
    attended: [],
    pending: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPlayers = useCallback(async () => {
    if (!scheduleId) {
      setData({ attended: [], pending: [] })
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/scanner/schedules/${scheduleId}/players`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const responseData = await response.json().catch(() => ({}))
        throw new Error(responseData.error || `Failed to fetch players (${response.status})`)
      }

      const result = (await response.json()) as PlayersResponse
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch players')
      setData({ attended: [], pending: [] })
    } finally {
      setIsLoading(false)
    }
  }, [scheduleId])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  return {
    ...data,
    isLoading,
    error,
    refresh: fetchPlayers,
  }
}
