'use client'

import { motion } from 'framer-motion'
import { Users, CreditCard, CalendarDays } from 'lucide-react'
import { fadeUpVariants } from '@/lib/animations'
import { QuickActionCard } from './quick-action-card'
import { useRequiredUser } from '@/lib/context/user-context'

interface DashboardClientProps {
  recentRegistrationsCount: number
  pendingPaymentsCount: number
  pendingPaymentsTotal: number
}

export function DashboardClient({
  recentRegistrationsCount,
  pendingPaymentsCount,
  pendingPaymentsTotal,
}: DashboardClientProps) {
  const user = useRequiredUser()

  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Hero Section */}
      <motion.div
        custom={0}
        initial="hidden"
        animate="visible"
        variants={fadeUpVariants}
        className="mb-12"
      >
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Welcome, {roleLabel}
        </h1>
        <p className="text-lg text-muted-foreground">
          Here's what's happening today
        </p>
      </motion.div>

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <QuickActionCard
          icon={Users}
          title="Recent Registrations"
          description="View your latest registrations"
          stat={recentRegistrationsCount.toString()}
          href="/dashboard/registrations"
          custom={0}
        />
        <QuickActionCard
          icon={CreditCard}
          title="Pending Payments"
          description="Review pending payment items"
          stat={`${pendingPaymentsCount} items`}
          href="/dashboard/payments"
          custom={1}
        />
        <QuickActionCard
          icon={CalendarDays}
          title="Create Schedule"
          description="Add a new game"
          stat="Quick action"
          href="/dashboard/schedules"
          custom={2}
        />
      </div>
    </div>
  )
}
