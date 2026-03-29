'use client'

import Link from 'next/link'
import { type LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface QuickActionCardProps {
  icon: LucideIcon
  title: string
  description: string
  stat: string
  href: string
  custom?: number
}

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: custom * 0.1 },
  }),
}

export function QuickActionCard({
  icon: Icon,
  title,
  description,
  stat,
  href,
  custom = 0,
}: QuickActionCardProps) {
  return (
    <motion.div
      custom={custom}
      initial="hidden"
      animate="visible"
      variants={fadeUpVariants}
    >
      <Link
        href={href}
        className="flex flex-col p-4 border border-border rounded-lg bg-card hover:bg-card/80 transition-colors cursor-pointer h-full"
      >
        <div className="flex items-start justify-between mb-3">
          <Icon size={24} className="text-accent" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-auto">{description}</p>
        <div className="text-lg font-bold text-accent mt-4">{stat}</div>
      </Link>
    </motion.div>
  )
}
