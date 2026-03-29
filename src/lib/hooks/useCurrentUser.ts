'use client'

import { useUser } from '@/lib/context/user-context'

export function useCurrentUser() {
  const { user } = useUser()
  return {
    user: user ?? undefined,
    isLoading: false,
  }
}
