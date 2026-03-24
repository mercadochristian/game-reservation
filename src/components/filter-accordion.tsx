'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Filter } from 'lucide-react'

interface FilterAccordionProps {
  open: boolean
  onToggle: () => void
  label?: string
  activeFilterCount?: number
  children: React.ReactNode
}

export function FilterAccordion({
  open,
  onToggle,
  label = 'Filters',
  activeFilterCount,
  children,
}: FilterAccordionProps) {
  const displayLabel = activeFilterCount && activeFilterCount > 0 ? `${label} (${activeFilterCount})` : label

  return (
    <div className="bg-card border-border border rounded-lg mb-6 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Filter size={16} />
          {displayLabel}
        </span>
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
