'use client'

import { useCallback, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NavModal } from '@/components/navigation/nav-modal'
import { NAVIGATION_CONFIG, getNavByRole, type Role } from '@/lib/config/navigation'
import { branding } from '@/lib/config/branding'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user-context'
import { SKILL_LEVEL_LABELS } from '@/lib/constants/labels'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { user } = useUser()
  const [navModalOpen, setNavModalOpen] = useState(false)

  const role = (user?.role as Role) ?? null

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
    return ROLE_LABELS[role] ?? null
  }, [user, role])

  const categories = useMemo(
    () => getNavByRole(role),
    [role]
  )

  const handleNavigate = useCallback((href: string) => {
    router.push(href)
  }, [router])

  if (!role) return null

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Mobile: Fixed Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-4 z-40">
        <button
          onClick={() => setNavModalOpen(true)}
          className="p-1 hover:bg-muted rounded-md transition-colors cursor-pointer"
          aria-label="Open navigation"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          {branding.logo && (
            <Image
              src={branding.logo.url}
              alt={branding.logo.altText}
              width={28}
              height={36}
              className="shrink-0"
            />
          )}
          <div className="text-center">
            <div className="text-xs font-semibold text-foreground">{branding.name}</div>
          </div>
        </div>
        <div className="w-10" />
      </div>

      {/* Mobile: Navigation Modal */}
      <NavModal
        isOpen={navModalOpen}
        onClose={() => setNavModalOpen(false)}
        categories={categories}
        profilePage={NAVIGATION_CONFIG.profilePage}
        signOutLabel={NAVIGATION_CONFIG.signOutAction.label}
        pathname={pathname}
        onNavigate={handleNavigate}
        onSignOut={handleSignOut}
      />

      {/* Desktop: Fixed Sidebar */}
      <div className="hidden lg:flex flex-col w-64 bg-card border-r border-border fixed h-screen z-40">
        {/* Logo Section */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            {branding.logo && (
              <Image
                src={branding.logo.url}
                alt={branding.logo.altText}
                width={40}
                height={48}
                className="shrink-0"
              />
            )}
            <div>
              <div className="font-bold text-foreground">{branding.name}</div>
              <div className="text-xs text-muted-foreground">{branding.tagline}</div>
            </div>
          </div>
        </div>

        {/* Navigation with Categories */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {/* Profile Link */}
          <Link
            href={NAVIGATION_CONFIG.profilePage.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname === NAVIGATION_CONFIG.profilePage.href
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {(() => {
              const ProfileIcon = NAVIGATION_CONFIG.profilePage.icon
              return <ProfileIcon size={20} />
            })()}
            <span>{NAVIGATION_CONFIG.profilePage.label}</span>
          </Link>

          {/* Category Groups */}
          {categories.map(category => (
            <div key={category.id}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2 mb-1">
                {category.label}
              </h3>
              <div className="space-y-1">
                {category.pages.map(page => {
                  const PageIcon = page.icon
                  const isActive = pathname === page.href
                  const isComingSoon = page.isComingSoon

                  return (
                    <div key={page.href} title={isComingSoon ? 'Coming soon' : ''}>
                      {isComingSoon ? (
                        <div
                          className="flex items-center gap-3 px-4 py-2 rounded-md text-sm text-muted-foreground opacity-40 cursor-not-allowed"
                        >
                          <PageIcon size={18} />
                          <span>{page.label}</span>
                        </div>
                      ) : (
                        <Link
                          href={page.href}
                          className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm transition-colors ${
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <PageIcon size={18} />
                          <span>{page.label}</span>
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sign Out Section */}
        <div className="border-t border-border p-4 space-y-2">
          {/* User Info */}
          {(displayName || displaySubtitle) && (
            <div className="px-3 py-2">
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
