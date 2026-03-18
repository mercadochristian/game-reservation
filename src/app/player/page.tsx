'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { fadeUpVariants } from '@/lib/animations'

export default function PlayerDashboard() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-4xl font-bold text-foreground mb-2">Player Dashboard</h1>
        <p className="text-muted-foreground mb-8">Register for games and manage your profile.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/player/register">
          <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold text-foreground mb-4">📋 Register for Game</h2>
            <p className="text-muted-foreground">Sign up for upcoming games</p>
          </motion.div>
        </Link>
        <Link href="/player/registrations">
          <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold text-foreground mb-4">📊 My Registrations</h2>
            <p className="text-muted-foreground">View your upcoming games</p>
          </motion.div>
        </Link>
        <Link href="/player/profile">
          <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold text-foreground mb-4">⭐ My Profile</h2>
            <p className="text-muted-foreground">Update your skill level and info</p>
          </motion.div>
        </Link>
      </div>
    </div>
  )
}
