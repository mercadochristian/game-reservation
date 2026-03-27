'use client'

import { memo, useCallback, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { UserCircle, MapPin, CalendarDays, Users, CreditCard, LogOut, Menu, X, AlertTriangle, QrCode, Landmark, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { branding } from '@/lib/config/branding'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user-context'
import { SKILL_LEVEL_LABELS } from '@/lib/constants/labels'

type Role = 'admin' | 'facilitator' | 'player' | 'super_admin'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  active: boolean
  roles: Role[],
  isComingSoon?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Profile',          href: '/dashboard',                    icon: UserCircle,    active: true,  roles: ['admin', 'super_admin', 'facilitator', 'player'] },
  { label: 'Users',            href: '/dashboard/users',              icon: Users,         active: true,  roles: ['admin', 'super_admin'] },
  { label: 'Registrations',    href: '/dashboard/registrations',      icon: Users,         active: true,  roles: ['admin', 'super_admin'] },
  { label: 'Payments',         href: '/dashboard/payments',           icon: CreditCard,    active: true,  roles: ['admin', 'super_admin'] },
  { label: 'Schedules',        href: '/dashboard/schedules',          icon: CalendarDays,  active: true,  roles: ['admin', 'super_admin'] },
  { label: 'Locations',        href: '/dashboard/locations',          icon: MapPin,        active: true,  roles: ['admin', 'super_admin'] },
  { label: 'Pay Channels',     href: '/dashboard/payment-channels',   icon: Landmark,      active: true,  roles: ['admin', 'super_admin'] },
  { label: 'Error Logs',       href: '/dashboard/logs',               icon: AlertTriangle, active: true,  roles: ['super_admin']},
  { label: 'QR Scanner',       href: '/dashboard/scanner',            icon: QrCode,        active: false,  roles: ['facilitator'] },
  { label: 'Team Management',  href: '/dashboard/teams',              icon: Users,         active: false, roles: ['facilitator'] },
  { label: 'Award MVP',        href: '/dashboard/mvp',                icon: Users,         active: false, roles: ['facilitator'] },
  { label: 'Register',         href: '/dashboard/register',           icon: CalendarDays,  active: false,  roles: ['player'] },
  { label: 'My Registrations', href: '/dashboard/my-registrations',   icon: CalendarDays,  active: false, roles: ['player'] },
]

// Extracted & memoized — avoids re-render when parent state (drawer, profile) changes
export const NavItems = memo(function NavItems({ navItems, pathname }: { navItems: NavItem[]; pathname: string }) {
  return (
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
})

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { user } = useUser()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const role = user?.role ?? null

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }, [supabase, router])

  const displayName = useMemo(
    () => user
      ? [user.first_name, user.last_name].filter(Boolean).join(' ') || null
      : null,
    [user]
  )

  const displaySubtitle = useMemo(() => {
    if (!user) return null
    const ROLE_LABELS: Record<Role, string> = {
      admin: 'Admin',
      super_admin: 'Super Admin',
      facilitator: 'Facilitator',
      player: 'Player',
    }
    if (role === 'player' && user.skill_level) {
      return SKILL_LEVEL_LABELS[user.skill_level] ?? null
    }
    return ROLE_LABELS[role!] ?? null
  }, [user, role])

  const navItems = useMemo(
    () => role ? NAV_ITEMS.filter(item => item.roles.includes(role)) : [],
    [role]
  )

  if (!role) return null

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
                  <NavItems navItems={navItems} pathname={pathname} />
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
          <NavItems navItems={navItems} pathname={pathname} />
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
