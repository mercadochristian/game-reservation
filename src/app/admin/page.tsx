'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { fadeUpVariants } from '@/lib/animations'

export default function AdminDashboard() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-4xl font-bold text-foreground mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground mb-8">Manage schedules, teams, and player registrations.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/admin/schedules">
          <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold text-foreground mb-4">📅 Schedule Management</h2>
            <p className="text-muted-foreground">Create and edit game schedules</p>
          </motion.div>
        </Link>
        <Link href="/admin/registrations">
          <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold text-foreground mb-4">👥 Registrations</h2>
            <p className="text-muted-foreground">Review and manage player registrations</p>
          </motion.div>
        </Link>
        <Link href="/admin/payments">
          <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold text-foreground mb-4">💰 Payments</h2>
            <p className="text-muted-foreground">Verify payment proofs</p>
          </motion.div>
        </Link>
        <Link href="/admin/locations">
          <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold text-foreground mb-4">📍 Locations</h2>
            <p className="text-muted-foreground">Manage gym and court locations</p>
          </motion.div>
        </Link>
      </div>
    </div>
  )
}
