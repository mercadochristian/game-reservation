'use client'

import { branding } from '@/lib/config/branding'

export function DashboardHeader() {
  return (
    <header className="bg-card border-b border-border px-6 py-3 flex items-center gap-3">
      {branding.logo && (
        <img
          src={branding.logo.url}
          alt={branding.logo.altText}
          className="h-10 w-auto"
        />
      )}
      <div>
        <p className="text-base font-bold text-foreground leading-tight">{branding.name}</p>
        <p className="text-xs text-muted-foreground italic">{branding.tagline}</p>
      </div>
    </header>
  )
}
