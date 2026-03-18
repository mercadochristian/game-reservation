import type { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'x-profile'
const TTL_SECONDS = 300 // 5 minutes

export type ProfileData = {
  role: string
  profile_completed: boolean
}

export function readProfileCache(request: NextRequest): ProfileData | null {
  const cookie = request.cookies.get(COOKIE_NAME)
  if (!cookie?.value) return null
  try {
    return JSON.parse(atob(cookie.value)) as ProfileData
  } catch {
    return null
  }
}

export function writeProfileCache(response: NextResponse, data: ProfileData): void {
  response.cookies.set(COOKIE_NAME, btoa(JSON.stringify(data)), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  })
}

export function clearProfileCache(response: NextResponse): void {
  response.cookies.delete(COOKIE_NAME)
}
