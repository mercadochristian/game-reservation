'use client'

import { motion } from 'framer-motion'

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: custom * 0.1 },
  }),
}

export default function AdminDashboard() {
  return (
    <div className="dark min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <h1 className="text-4xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground mb-8">Manage schedules, teams, and player registrations.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">📅 Schedule Management</h2>
            <p className="text-muted-foreground">Create and edit game schedules</p>
          </motion.div>
          <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">👥 Registrations</h2>
            <p className="text-muted-foreground">Review and manage player registrations</p>
          </motion.div>
          <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">💰 Payments</h2>
            <p className="text-muted-foreground">Verify payment proofs</p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
