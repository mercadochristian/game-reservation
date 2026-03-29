'use client'

import { createContext, useContext } from 'react'
import type { User } from '@/types'

interface UserContextValue {
  user: User | null
}

const UserContext = createContext<UserContextValue>({ user: null })

export function UserProvider({
  user,
  children,
}: {
  user: User | null
  children: React.ReactNode
}) {
  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const { user } = useContext(UserContext)
  return { user, isAuthenticated: user !== null }
}

export function useRequiredUser() {
  const { user } = useContext(UserContext)
  if (!user) {
    throw new Error('useRequiredUser must be used within an authenticated route with a UserProvider')
  }
  return user
}
