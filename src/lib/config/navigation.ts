import type { LucideIcon } from 'lucide-react'
import { Users, MapPin, CalendarDays, CreditCard, AlertTriangle, QrCode, Landmark, UserCircle } from 'lucide-react'

export type Role = 'admin' | 'facilitator' | 'player' | 'super_admin'

export interface NavPage {
  label: string
  href: string
  icon: LucideIcon
  roles: Role[]
  isComingSoon?: boolean
}

export interface NavCategory {
  id: string
  label: string
  pages: NavPage[]
}

export interface NavigationConfig {
  categories: NavCategory[]
  profilePage: NavPage
  signOutAction: { label: string; roles: Role[] }
}

export const NAVIGATION_CONFIG: NavigationConfig = {
  categories: [
    {
      id: 'management',
      label: 'Management',
      pages: [
        { label: 'Users', href: '/dashboard/users', icon: Users, roles: ['admin', 'super_admin'] },
        { label: 'Locations', href: '/dashboard/locations', icon: MapPin, roles: ['admin', 'super_admin'] },
        { label: 'Schedules', href: '/dashboard/schedules', icon: CalendarDays, roles: ['admin', 'super_admin'] },
        { label: 'Payment Channels', href: '/dashboard/payment-channels', icon: Landmark, roles: ['admin', 'super_admin'] },
      ],
    },
    {
      id: 'registrations',
      label: 'Registrations',
      pages: [
        { label: 'Registrations', href: '/dashboard/registrations', icon: Users, roles: ['admin', 'super_admin'] },
      ],
    },
    {
      id: 'payments',
      label: 'Payments',
      pages: [
        { label: 'Payments', href: '/dashboard/payments', icon: CreditCard, roles: ['admin', 'super_admin'] },
      ],
    },
    {
      id: 'system',
      label: 'System',
      pages: [
        { label: 'Error Logs', href: '/dashboard/logs', icon: AlertTriangle, roles: ['super_admin'] },
      ],
    },
    {
      id: 'facilitator',
      label: 'Facilitator',
      pages: [
        { label: 'QR Scanner', href: '/dashboard/scanner', icon: QrCode, roles: ['facilitator'], isComingSoon: true },
        { label: 'Team Management', href: '/dashboard/teams', icon: Users, roles: ['facilitator'], isComingSoon: true },
        { label: 'Award MVP', href: '/dashboard/mvp', icon: Users, roles: ['facilitator'], isComingSoon: true },
      ],
    },
    {
      id: 'player',
      label: 'Player',
      pages: [
        { label: 'Register', href: '/dashboard/register', icon: CalendarDays, roles: ['player'], isComingSoon: true },
        { label: 'My Registrations', href: '/dashboard/my-registrations', icon: CalendarDays, roles: ['player'], isComingSoon: true },
      ],
    },
  ],
  profilePage: { label: 'Profile', href: '/dashboard', icon: UserCircle, roles: ['admin', 'super_admin', 'facilitator', 'player'] },
  signOutAction: { label: 'Sign Out', roles: ['admin', 'super_admin', 'facilitator', 'player'] },
}

// Helper: get nav categories filtered by role
export function getNavByRole(role: Role | null): NavCategory[] {
  if (!role) return []
  return NAVIGATION_CONFIG.categories.map(cat => ({
    ...cat,
    pages: cat.pages.filter(page => page.roles.includes(role)),
  })).filter(cat => cat.pages.length > 0)
}
