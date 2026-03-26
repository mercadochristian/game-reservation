'use client'

import { useState } from 'react'
import Link from 'next/link'
import { branding } from '@/lib/config/branding'
import { LoginModal } from '@/components/login-modal'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'

export function PublicNav() {
  const { user, isLoading } = useCurrentUser()
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  const renderDashboardLink = () => {
    if (isLoading) {
      return <div className="w-24 h-8 bg-muted rounded animate-pulse" />
    }

    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      return (
        <Link href="/dashboard" className="inline-flex items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap transition-all outline-none select-none cursor-pointer h-8 gap-1.5 px-2.5 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 hover:opacity-90 mr-2">
          Dashboard
        </Link>
      )
    }

    return null;
  }


  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 h-16 bg-card border-b border-border shadow-sm flex items-center px-4">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          {/* Logo + Brand */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            {branding.logo.url && (
              <img
                src={branding.logo.url}
                alt={branding.logo.altText}
                width={branding.logo.width || 48}
                height={branding.logo.height || 48}
                className="h-10 w-auto"
              />
            )}
            <span className="font-semibold text-foreground">{branding.name}</span>
          </Link>

          {/* CTA Button */}
          <div>
            {
              renderDashboardLink()
            }
          </div>
        </div>
      </nav>

      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
    </>
  )
}
