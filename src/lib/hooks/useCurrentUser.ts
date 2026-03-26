'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

export function useCurrentUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) {
        setUser(null)
        return
      }
      supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()
        .then(({ data }) => {
          setUser(data ?? null)
        })
    })
  }, [])

  return {
    user,
    isLoading: user === undefined,
  }
}
