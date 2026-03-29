'use client'

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { branding } from '@/lib/config/branding'
import { fadeUpVariants } from '@/lib/animations'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 px-4 sm:px-6">
      {/* Atmosphere layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        {/* Radial glow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 60% at 50% 0%, oklch(0.62 0.19 255 / 0.15), transparent 70%)',
          }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle, oklch(0.97 0.008 250 / 0.12) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
        {/* Logo + Name */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="flex items-center gap-4 sm:gap-6 justify-center"
        >
          {branding.logo.url && (
            <img
              src={branding.logo.url}
              alt={branding.logo.altText}
              width={branding.logo.width || 48}
              height={branding.logo.height || 48}
              className="h-12 w-auto"
            />
          )}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
            {branding.name}
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="text-xl sm:text-2xl font-medium"
          style={{ color: 'var(--primary)' }}
        >
          Reserve Your Spot
        </motion.p>

        {/* Description */}
        <motion.p
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto"
        >
          Find games near you. Register in seconds. Play today.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="pt-4"
        >
          <a
            href="#schedule"
            className="inline-flex items-center justify-center gap-2 h-10 px-6
                       rounded-lg bg-primary text-primary-foreground text-sm font-medium
                       transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Browse Games
            <ChevronDown className="h-4 w-4" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
