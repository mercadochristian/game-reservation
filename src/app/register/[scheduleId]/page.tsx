import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/get-current-user'
import { createServiceClient } from '@/lib/supabase/service'
import type { ScheduleWithLocation } from '@/types'
import { RegisterClient } from './register-client'

export default async function RegisterPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ scheduleId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>) {
  const { scheduleId } = await params
  const sp = await searchParams
  const dateParam = typeof sp.date === 'string' ? sp.date : ''

  // Auth guard
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth')
  }

  const supabase = createServiceClient()

  // Fetch existing registrations for this user to determine already-registered schedules
  const { data: existingRegs } = (await supabase
    .from('registrations')
    .select('schedule_id')
    .eq('player_id', user.id)) as { data: Array<{ schedule_id: string }> | null }

  const alreadyRegisteredIds: string[] = (existingRegs ?? []).map((r) => r.schedule_id)

  // Redirect if already registered for the primary schedule
  if (alreadyRegisteredIds.includes(scheduleId)) {
    redirect(`/?date=${dateParam}`)
  }

  // Fetch primary schedule with registration count
  const { data: sched } = (await (supabase
    .from('schedules')
    .select('*, locations(id, name, address, google_map_url), registrations(count)')
    .eq('id', scheduleId)
    .single()) as { data: any })

  if (!sched) {
    redirect('/')
  }

  const registrationCount: number = sched.registrations?.[0]?.count ?? 0

  // Compute skill guard
  const requiredLevels: string[] = (sched as any).required_levels ?? []
  const skillError =
    requiredLevels.length > 0 && !requiredLevels.includes(user.skill_level ?? '')

  // Compute schedule state guard
  const isPast = new Date(sched.start_time) < new Date()
  const isFull =
    sched.status === 'full' || registrationCount >= sched.max_players
  const isClosed =
    sched.status === 'cancelled' || sched.status === 'completed'

  let scheduleError: 'past' | 'full' | 'closed' | null = null
  if (isPast) scheduleError = 'past'
  else if (isFull) scheduleError = 'full'
  else if (isClosed) scheduleError = 'closed'

  const primaryScheduleSlot = {
    schedule: sched as ScheduleWithLocation,
    registrationCount,
  }

  return (
    <RegisterClient
      scheduleId={scheduleId}
      user={user}
      skillError={skillError}
      scheduleError={scheduleError}
      primaryScheduleSlot={primaryScheduleSlot}
      alreadyRegisteredIds={alreadyRegisteredIds}
    />
  )
}
