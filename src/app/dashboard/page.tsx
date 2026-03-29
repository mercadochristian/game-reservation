import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { getRecentRegistrationsCount, getPendingPaymentsStats } from '@/lib/dashboard/queries'

export default async function DashboardPage() {
  const [recentRegistrationsCount, pendingPaymentsStats] = await Promise.all([
    getRecentRegistrationsCount(),
    getPendingPaymentsStats(),
  ])

  return (
    <DashboardClient
      recentRegistrationsCount={recentRegistrationsCount}
      pendingPaymentsCount={pendingPaymentsStats.count}
      pendingPaymentsTotal={pendingPaymentsStats.total}
    />
  )
}
