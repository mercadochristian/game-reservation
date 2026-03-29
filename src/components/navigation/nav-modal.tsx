'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { X, UserCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { NavCategory, NavPage } from '@/lib/config/navigation'
import type { User } from '@/types'

interface NavModalProps {
  isOpen: boolean
  onClose: () => void
  categories: NavCategory[]
  profilePage: NavPage
  signOutLabel: string
  pathname: string
  onNavigate: (href: string) => void
  onSignOut: () => void
  user: User | null
  skillLevelLabel?: string
  roleLabel?: string
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
  user,
  skillLevelLabel,
  roleLabel,
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
            {/* Header with user info and close button */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between gap-3 mb-4">
                {/* User Info (Clickable) */}
                <Link
                  href={profilePage.href}
                  onClick={() => handleNavClick(profilePage.href)}
                  className="flex items-center gap-3 flex-1 text-center hover:opacity-80 transition-opacity"
                >
                  {/* Avatar Column */}
                  <div className="shrink-0">
                    <UserCircle size={40} className="text-muted-foreground" />
                  </div>
                  {/* Name and Subtitle Column */}
                  <div className="flex-1 min-w-0">
                    {user && (
                      <>
                        <p className="text-sm font-semibold text-foreground truncate">
                          {[user.first_name, user.last_name].filter(Boolean).join(' ')}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {skillLevelLabel && roleLabel ? `${skillLevelLabel} | ${roleLabel}` : roleLabel || skillLevelLabel}
                        </p>
                      </>
                    )}
                  </div>
                </Link>
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-muted rounded-md transition-colors shrink-0"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
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
                              onClick={() => handleNavClick(page.href)}
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

            {/* Footer: Sign Out */}
            <div className="border-t border-border p-4">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
              >
                <X size={18} />
                <span>{signOutLabel}</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
