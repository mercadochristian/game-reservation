import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/get-current-user'
import DashboardClient from './dashboard-client'

type Role = 'admin' | 'facilitator' | 'player' | 'super_admin'

export default async function Dashboard() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth')
  }

  const role: Role = (user.role as Role) ?? 'player'

  return <DashboardClient role={role} />
}
