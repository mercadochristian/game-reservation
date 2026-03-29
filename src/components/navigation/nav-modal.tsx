'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { NavCategory, NavPage } from '@/lib/config/navigation'

interface NavModalProps {
  isOpen: boolean
  onClose: () => void
  categories: NavCategory[]
  profilePage: NavPage
  signOutLabel: string
  pathname: string
  onNavigate: (href: string) => void
  onSignOut: () => void
}

export function NavModal({
  isOpen,
  onClose,
  categories,
  profilePage,
  signOutLabel,
  pathname,
  onNavigate,
  onSignOut,
}: NavModalProps) {
  const handleNavClick = useCallback(
    (href: string) => {
      onNavigate(href)
      onClose()
    },
    [onNavigate, onClose]
  )

  const handleSignOut = useCallback(
    () => {
      onSignOut()
      onClose()
    },
    [onSignOut, onClose]
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />

          {/* Modal */}
          <motion.div
            initial={{ x: -256 }}
            animate={{ x: 0 }}
            exit={{ x: -256 }}
            transition={{ duration: 0.2 }}
            className="fixed left-0 top-0 bottom-0 w-64 bg-background border-r border-border z-50 overflow-y-auto flex flex-col lg:hidden"
          >
            {/* Header with close button */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Menu</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-muted rounded-md transition-colors"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Categories and pages */}
            <div className="flex-1 overflow-y-auto p-4">
              {categories.map(category => {
                const Icon = profilePage.icon
                return (
                  <div key={category.id} className="mb-6">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {category.label}
                    </h3>
                    <div className="space-y-1">
                      {category.pages.map(page => {
                        const PageIcon = page.icon
                        const isActive = pathname === page.href
                        const isComingSoon = page.isComingSoon
                        return (
                          <div key={page.href}>
                            {isComingSoon ? (
                              <div
                                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm opacity-50 cursor-not-allowed"
                                title="Coming soon"
                              >
                                <PageIcon size={16} />
                                <span>{page.label}</span>
                              </div>
                            ) : (
                              <Link
                                href={page.href}
                                onClick={() => handleNavClick(page.href)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                                  isActive
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-foreground hover:bg-muted'
                                }`}
                              >
                                <PageIcon size={16} />
                                <span>{page.label}</span>
                              </Link>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer: Profile and Sign Out */}
            <div className="border-t border-border p-4 space-y-2">
              <Link
                href={profilePage.href}
                onClick={() => handleNavClick(profilePage.href)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  pathname === profilePage.href
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <profilePage.icon size={16} />
                <span>{profilePage.label}</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-foreground hover:bg-muted transition-colors text-left"
              >
                <X size={16} />
                <span>{signOutLabel}</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
