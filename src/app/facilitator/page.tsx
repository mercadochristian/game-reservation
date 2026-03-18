'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { fadeUpVariants } from '@/lib/animations'

export default function FacilitatorDashboard() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-4xl font-bold text-foreground mb-2">Facilitator Dashboard</h1>
        <p className="text-muted-foreground mb-8">Manage attendance and game day operations.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/facilitator/scanner">
          <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold text-foreground mb-4">📱 QR Scanner</h2>
            <p className="text-muted-foreground">Scan player QR codes for attendance</p>
          </motion.div>
        </Link>
        <Link href="/facilitator/teams">
          <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold text-foreground mb-4">👥 Team Management</h2>
            <p className="text-muted-foreground">View and organize teams</p>
          </motion.div>
        </Link>
        <Link href="/facilitator/mvp">
          <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
            <h2 className="text-xl font-semibold text-foreground mb-4">⭐ Award MVP</h2>
            <p className="text-muted-foreground">Recognize outstanding players</p>
          </motion.div>
        </Link>
      </div>
    </div>
  )
}
