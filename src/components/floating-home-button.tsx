'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Home } from 'lucide-react'
import { motion } from 'framer-motion'

export function FloatingHomeButton() {
  const pathname = usePathname()
  const router = useRouter()

  // Hide on homepage and registration pages
  const isHomepage = pathname === '/'
  const isRegistration = pathname.startsWith('/register/')

  if (isHomepage || isRegistration) {
    return null
  }

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      onClick={() => router.push('/')}
      className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
      aria-label="Go to home"
      title="Go home"
    >
      <Home size={24} />
    </motion.button>
  )
}
