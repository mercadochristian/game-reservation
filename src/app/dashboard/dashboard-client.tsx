'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { fadeUpVariants } from '@/lib/animations'

type Role = 'admin' | 'facilitator' | 'player' | 'super_admin'

interface DashboardClientProps {
  role: Role
}

export default function DashboardClient({ role }: DashboardClientProps) {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-4xl font-bold text-foreground mb-2">
          {role === 'admin' && 'Admin Dashboard'}
          {role === 'super_admin' && 'Admin Dashboard'}
          {role === 'facilitator' && 'Facilitator Dashboard'}
          {role === 'player' && 'Player Dashboard'}
        </h1>
        <p className="text-muted-foreground mb-8">
          {role === 'admin' && 'Manage schedules, teams, and player registrations.'}
          {role === 'super_admin' && 'Manage schedules, teams, and player registrations.'}
          {role === 'facilitator' && 'Manage attendance and game day operations.'}
          {role === 'player' && 'Register for games and manage your profile.'}
        </p>
      </motion.div>

      {/* Admin Dashboard */}
      {(role === 'admin' || role === 'super_admin') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/admin/schedules">
            <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
              <h2 className="text-xl font-semibold text-foreground mb-4">Schedule Management</h2>
              <p className="text-muted-foreground">Create and edit game schedules</p>
            </motion.div>
          </Link>
          <Link href="/admin/registrations">
            <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
              <h2 className="text-xl font-semibold text-foreground mb-4">Registrations</h2>
              <p className="text-muted-foreground">Review and manage player registrations</p>
            </motion.div>
          </Link>
          <Link href="/admin/payments">
            <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
              <h2 className="text-xl font-semibold text-foreground mb-4">Payments</h2>
              <p className="text-muted-foreground">Verify payment proofs</p>
            </motion.div>
          </Link>
          <Link href="/admin/locations">
            <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
              <h2 className="text-xl font-semibold text-foreground mb-4">Locations</h2>
              <p className="text-muted-foreground">Manage gym and court locations</p>
            </motion.div>
          </Link>
        </div>
      )}

      {/* Facilitator Dashboard */}
      {role === 'facilitator' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/facilitator/scanner">
            <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
              <h2 className="text-xl font-semibold text-foreground mb-4">QR Scanner</h2>
              <p className="text-muted-foreground">Scan player QR codes for attendance</p>
            </motion.div>
          </Link>
          <Link href="/facilitator/teams">
            <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
              <h2 className="text-xl font-semibold text-foreground mb-4">Team Management</h2>
              <p className="text-muted-foreground">View and organize teams</p>
            </motion.div>
          </Link>
          <Link href="/facilitator/mvp">
            <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
              <h2 className="text-xl font-semibold text-foreground mb-4">Award MVP</h2>
              <p className="text-muted-foreground">Recognize outstanding players</p>
            </motion.div>
          </Link>
        </div>
      )}

      {/* Player Dashboard */}
      {role === 'player' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/player/register">
            <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
              <h2 className="text-xl font-semibold text-foreground mb-4">Register for Game</h2>
              <p className="text-muted-foreground">Sign up for upcoming games</p>
            </motion.div>
          </Link>
          <Link href="/player/registrations">
            <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
              <h2 className="text-xl font-semibold text-foreground mb-4">My Registrations</h2>
              <p className="text-muted-foreground">View your upcoming games</p>
            </motion.div>
          </Link>
          <Link href="/player/profile">
            <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg shadow p-6 cursor-pointer hover:bg-muted/50 transition-colors">
              <h2 className="text-xl font-semibold text-foreground mb-4">My Profile</h2>
              <p className="text-muted-foreground">Update your skill level and info</p>
            </motion.div>
          </Link>
        </div>
      )}
    </div>
  )
}
