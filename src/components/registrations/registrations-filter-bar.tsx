'use client'

import { Label } from '@/components/ui/label'
import type { Location } from '@/types'

interface RegistrationsFilterBarProps {
  locations: Location[]
  selectedLocationId: string
  selectedDateRange: 'all' | 'last30' | 'last7'
  totalRegistrations: number
  onLocationChange: (locationId: string) => void
  onDateRangeChange: (range: 'all' | 'last30' | 'last7') => void
}

export function RegistrationsFilterBar({
  locations,
  selectedLocationId,
  selectedDateRange,
  totalRegistrations,
  onLocationChange,
  onDateRangeChange,
}: RegistrationsFilterBarProps) {
  const dateRangeLabels: Record<'all' | 'last30' | 'last7', string> = {
    all: 'All',
    last7: 'Last 7 Days',
    last30: 'Last 30 Days',
  }

  return (
    <div className="bg-card border-border border rounded-lg p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <Label className="text-sm font-semibold mb-2 block">Location</Label>
          <div className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm text-foreground items-center">
            <select
              value={selectedLocationId}
              onChange={(e) => onLocationChange(e.target.value)}
              className="h-full w-full bg-transparent outline-none cursor-pointer"
            >
              <option value="">Select a location...</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 block">Date Range</Label>
          <div className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm text-foreground items-center">
            <select
              value={selectedDateRange}
              onChange={(e) => onDateRangeChange(e.target.value as 'all' | 'last30' | 'last7')}
              className="h-full w-full bg-transparent outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {selectedLocationId && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{totalRegistrations}</span> registrations total
        </div>
      )}
    </div>
  )
}
