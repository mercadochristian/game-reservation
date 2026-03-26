'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { FilterAccordion } from '@/components/filter-accordion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { Location } from '@/types'

interface GameFilterProps {
  locations: Location[]
  filterDate: string
  filterLocationId: string
}

export function GameFilter({ locations, filterDate, filterLocationId }: GameFilterProps) {
  const [open, setOpen] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const activeFilterCount = (filterDate ? 1 : 0) + (filterLocationId ? 1 : 0)

  const handleDateChange = (date: string) => {
    const params = new URLSearchParams()
    if (date) params.set('date', date)
    if (filterLocationId) params.set('locationId', filterLocationId)
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleLocationChange = (locationId: string) => {
    const params = new URLSearchParams()
    if (filterDate) params.set('date', filterDate)
    if (locationId) params.set('locationId', locationId)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <FilterAccordion
      open={open}
      onToggle={() => setOpen(!open)}
      label="Filters"
      activeFilterCount={activeFilterCount}
    >
      <div className="pt-3 flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 w-full">
          <Label className="text-xs font-medium mb-1 block">Date</Label>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex-1 w-full">
          <Label className="text-xs font-medium mb-1 block">Location</Label>
          <select
            value={filterLocationId}
            onChange={(e) => handleLocationChange(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm text-foreground"
          >
            <option value="">Select a location...</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(pathname)}
            className="gap-1 shrink-0"
          >
            <X size={14} />
            Clear
          </Button>
        )}
      </div>
    </FilterAccordion>
  )
}
