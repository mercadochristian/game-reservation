'use client'

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { getUserFriendlyMessage } from '@/lib/errors/messages'

export interface QueryState<T> {
  data: T | null
  error: string | null
  isLoading: boolean
}

export interface UseSupabaseQueryOptions {
  /** User-facing label used in error toasts, e.g. "load schedules" */
  context: string
  /** If true, a toast.error() is shown on failure (default: true) */
  showToast?: boolean
}

/**
 * Thin wrapper for Supabase query functions that standardises loading state,
 * error surfacing, and toast feedback.
 *
 * Returns { data, error, isLoading, execute }.
 * Call `execute(queryFn)` to run a query.
 *
 * Example:
 *   const { data, isLoading, execute } = useSupabaseQuery<Location[]>({ context: 'load locations' })
 *   useEffect(() => { execute(() => supabase.from('locations').select('*')) }, [execute])
 */
export function useSupabaseQuery<T>(options: UseSupabaseQueryOptions) {
  const { context, showToast = true } = options

  const [state, setState] = useState<QueryState<T>>({
    data: null,
    error: null,
    isLoading: false,
  })

  // Keeps track of the active execution to prevent stale updates on unmount
  const executionIdRef = useRef(0)

  const execute = useCallback(
    async (
      queryFn: () => PromiseLike<{ data: T | null; error: unknown }>
    ): Promise<T | null> => {
      const executionId = ++executionIdRef.current

      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const result = await queryFn()

        if (executionId !== executionIdRef.current) return null

        if (result.error) {
          const friendly = getUserFriendlyMessage(result.error)
          console.error(`[useSupabaseQuery] Failed to ${context}:`, result.error)

          setState({ data: null, error: friendly, isLoading: false })

          if (showToast) {
            toast.error(`Failed to ${context}`, { description: friendly })
          }

          return null
        }

        setState({ data: result.data, error: null, isLoading: false })
        return result.data
      } catch (err) {
        if (executionId !== executionIdRef.current) return null

        const friendly = getUserFriendlyMessage(err)
        console.error(`[useSupabaseQuery] Unexpected error during ${context}:`, err)

        setState({ data: null, error: friendly, isLoading: false })

        if (showToast) {
          toast.error(`Failed to ${context}`, { description: friendly })
        }

        return null
      }
    },
    [context, showToast]
  )

  return { ...state, execute }
}
