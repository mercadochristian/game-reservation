'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { LayoutDashboard, MapPin, CalendarDays, Users, CreditCard, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { branding } from '@/lib/config/branding'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, active: true },
  { label: 'Locations', href: '/admin/locations', icon: MapPin, active: true },
  { label: 'Schedules', href: '/admin/schedules', icon: CalendarDays, active: false },
  { label: 'Registrations', href: '/admin/registrations', icon: Users, active: false },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard, active: false },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Only show nav on admin sub-pages (not the dashboard itself)
  const showNav = pathname !== '/admin'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (!showNav) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center px-4 z-40">
        {branding.logo && (
          <Image
            src={branding.logo.url}
            alt={branding.logo.altText}
            width={32}
            height={40}
            className="mr-3"
          />
        )}
        <div>
          <div className="text-sm font-semibold text-foreground">{branding.name}</div>
          <div className="text-xs text-muted-foreground">{branding.tagline}</div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col w-64 bg-card border-r border-border fixed h-screen">
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
        </nav>

        {/* Sign Out */}
        <div className="border-t border-border p-4">
          <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive">
            <LogOut size={20} />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:ml-64 w-full lg:w-auto lg:flex-1 mt-16 lg:mt-0 mb-20 lg:mb-0">
        {children}
      </div>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-card border-t border-border flex justify-around items-center z-40">
        {navItems
          .filter((item) => item.active)
          .map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                  isActive ? 'text-accent bg-muted/50' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={24} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        <button
          onClick={handleSignOut}
          className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-destructive hover:text-destructive/80 transition-colors cursor-pointer"
        >
          <LogOut size={24} />
          <span className="text-xs font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  )
}
