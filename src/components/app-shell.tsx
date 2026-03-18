'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, MapPin, CalendarDays, Users, CreditCard, LogOut, Menu, X, AlertTriangle, QrCode, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { branding } from '@/lib/config/branding'
import { createClient } from '@/lib/supabase/client'
import { getUserFriendlyMessage } from '@/lib/errors/messages'
import { SKILL_LEVEL_LABELS } from '@/lib/constants/labels'

type Role = 'admin' | 'facilitator' | 'player' | 'super_admin'

const NAV_ITEMS: Record<Role, Array<{ label: string; href: string; icon: LucideIcon; active: boolean }>> = {
  admin: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, active: true },
    { label: 'Locations', href: '/admin/locations', icon: MapPin, active: true },
    { label: 'Schedules', href: '/admin/schedules', icon: CalendarDays, active: true },
    { label: 'Registrations', href: '/admin/registrations', icon: Users, active: true },
    { label: 'Payments', href: '/admin/payments', icon: CreditCard, active: false },
  ],
  super_admin: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, active: true },
    { label: 'Locations', href: '/admin/locations', icon: MapPin, active: true },
    { label: 'Schedules', href: '/admin/schedules', icon: CalendarDays, active: true },
    { label: 'Registrations', href: '/admin/registrations', icon: Users, active: true },
    { label: 'Payments', href: '/admin/payments', icon: CreditCard, active: false },
    { label: 'Error Logs', href: '/admin/logs', icon: AlertTriangle, active: true },
  ],
  facilitator: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, active: true },
    { label: 'QR Scanner', href: '/facilitator/scanner', icon: QrCode, active: true },
    { label: 'Team Management', href: '/facilitator/teams', icon: Users, active: false },
    { label: 'Award MVP', href: '/facilitator/mvp', icon: Users, active: false },
  ],
  player: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, active: true },
    { label: 'Register', href: '/player/register', icon: CalendarDays, active: true },
    { label: 'My Registrations', href: '/player/registrations', icon: CalendarDays, active: false },
    { label: 'My Profile', href: '/player/profile', icon: Users, active: false },
  ],
}

interface AppShellProps {
  children: React.ReactNode
  role?: Role
}

export function AppShell({ children, role: providedRole }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [resolvedRole, setResolvedRole] = useState<Role | null>(providedRole ?? null)
  const [userProfile, setUserProfile] = useState<{
    first_name: string | null
    last_name: string | null
    skill_level: string | null
  } | null>(null)

  useEffect(() => {
    if (providedRole) return

    const fetchRole = async () => {
      try {
        const { data: authUser } = await supabase.auth.getUser()
        if (!authUser.user) {
          router.push('/auth')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role, first_name, last_name, skill_level')
          .eq('id', authUser.user.id)
          .single() as {
          data: { role: Role; first_name: string | null; last_name: string | null; skill_level: string | null } | null
          error: unknown
        }

        if (profileError) {
          console.error('[AppShell] Failed to fetch user role:', profileError)
          router.push('/auth')
          return
        }

        const userRole: Role = profile?.role ?? 'player'
        setResolvedRole(userRole)
        if (profile) {
          setUserProfile({
            first_name: profile.first_name,
            last_name: profile.last_name,
            skill_level: profile.skill_level,
          })
        }
      } catch (error) {
        console.error('[AppShell] Unexpected error fetching role:', getUserFriendlyMessage(error), error)
        router.push('/auth')
      }
    }

    fetchRole()
  }, [providedRole, supabase, router])

  const role = providedRole ?? resolvedRole
  if (!role) return null

  const navItems = NAV_ITEMS[role]

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  // Derive display values for user info
  const displayName = userProfile
    ? [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ') || null
    : null

  const ROLE_LABELS: Record<Role, string> = {
    admin: 'Admin',
    super_admin: 'Super Admin',
    facilitator: 'Facilitator',
    player: 'Player',
  }

  const displaySubtitle = (() => {
    if (!userProfile) return null
    if (role === 'player' && userProfile.skill_level) {
      return SKILL_LEVEL_LABELS[userProfile.skill_level] ?? null
    }
    return ROLE_LABELS[role!] ?? null
  })()

  const NavItems = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        const isComingSoon = !item.active

        return (
          <div key={item.href} title={isComingSoon ? 'Coming soon' : ''}>
            {isComingSoon ? (
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-not-allowed opacity-40`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </div>
            ) : (
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            )}
          </div>
        )
      })}
    </>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Mobile: Fixed Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center px-4 z-40">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-1 hover:bg-muted rounded-md transition-colors"
          aria-label="Open navigation"
        >
          <Menu size={24} />
        </button>
        <div className="flex-1 flex items-center justify-center gap-2">
          {branding.logo && (
            <Image
              src={branding.logo.url}
              alt={branding.logo.altText}
              width={32}
              height={40}
              className="shrink-0"
            />
          )}
          <div className="text-center">
            <div className="text-xs font-semibold text-foreground">{branding.name}</div>
            <div className="text-xs text-muted-foreground">{branding.tagline}</div>
          </div>
        </div>
        <div className="w-10" />
      </div>

      {/* Mobile: Drawer with AnimatePresence */}
      <div className="lg:hidden">
        <AnimatePresence>
          {drawerOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawerOpen(false)}
                className="fixed inset-0 z-40 bg-black/60"
              />

              {/* Drawer Panel */}
              <motion.div
                initial={{ x: -288 }}
                animate={{ x: 0 }}
                exit={{ x: -288 }}
                transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
                className="fixed top-0 left-0 h-full w-72 z-50 bg-card border-r border-border flex flex-col"
              >
                {/* Drawer Header */}
                <div className="p-6 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {branding.logo && (
                      <Image
                        src={branding.logo.url}
                        alt={branding.logo.altText}
                        width={32}
                        height={40}
                      />
                    )}
                    <div>
                      <div className="text-sm font-semibold text-foreground">{branding.name}</div>
                      <div className="text-xs text-muted-foreground">{branding.tagline}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-1 hover:bg-muted rounded-md transition-colors"
                    aria-label="Close navigation"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Drawer Nav */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                  <NavItems />
                </nav>

                {/* Drawer Sign Out */}
                <div className="border-t border-border p-4">
                  {/* User Info */}
                  {(displayName || displaySubtitle) && (
                    <div className="px-3 py-2 mb-3">
                      {displayName && (
                        <p className="text-sm font-medium text-foreground truncate leading-tight">{displayName}</p>
                      )}
                      {displaySubtitle && (
                        <p className="text-xs text-muted-foreground truncate">{displaySubtitle}</p>
                      )}
                    </div>
                  )}
                  <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                  >
                    <LogOut size={20} />
                    <span>Sign Out</span>
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop: Fixed Sidebar */}
      <div className="hidden lg:flex flex-col w-64 bg-card border-r border-border fixed h-screen z-40">
        {/* Logo Section */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            {branding.logo && (
              <Image
                src={branding.logo.url}
                alt={branding.logo.altText}
                width={40}
                height={48}
              />
            )}
            <div>
              <div className="font-bold text-foreground">{branding.name}</div>
              <div className="text-xs text-muted-foreground">{branding.tagline}</div>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <NavItems />
        </nav>

        {/* Sign Out */}
        <div className="border-t border-border p-4">
          {/* User Info */}
          {(displayName || displaySubtitle) && (
            <div className="px-3 py-2 mb-3">
              {displayName && (
                <p className="text-sm font-medium text-foreground truncate leading-tight">{displayName}</p>
              )}
              {displaySubtitle && (
                <p className="text-xs text-muted-foreground truncate">{displaySubtitle}</p>
              )}
            </div>
          )}
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full lg:ml-64 pt-16 lg:pt-0">
        {children}
      </div>
    </div>
  )
}
