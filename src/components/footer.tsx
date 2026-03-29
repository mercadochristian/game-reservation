'use client'

import Link from 'next/link'
import { Facebook, Instagram } from 'lucide-react'
import { branding } from '@/lib/config/branding'

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            © 2026 {branding.name}. All rights reserved.
          </p>

          {/* Social Links */}
          <div className="flex gap-4">
            <Link
              href={branding.social?.facebook || 'https://facebook.com'}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit our Facebook page"
              className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
            >
              <Facebook className="h-5 w-5" />
            </Link>
            <Link
              href={branding.social?.instagram || 'https://instagram.com'}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit our Instagram page"
              className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
            >
              <Instagram className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
