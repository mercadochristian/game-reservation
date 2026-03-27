'use client'

import { memo } from 'react'
import { ChevronDown, Filter } from 'lucide-react'

interface FilterAccordionProps {
  open: boolean
  onToggle: () => void
  label?: string
  activeFilterCount?: number
  children: React.ReactNode
}

export const FilterAccordion = memo(function FilterAccordion({
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

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className={`px-4 pb-4 border-t border-border transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
})
