import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { UserProvider } from '@/lib/context/user-context'
import { getCurrentUser } from '@/lib/supabase/get-current-user'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/auth')

  return (
    <UserProvider user={user}>
      <AppShell>{children}</AppShell>
    </UserProvider>
  )
}
