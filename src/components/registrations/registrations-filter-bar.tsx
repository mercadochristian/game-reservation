'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  const selectedLocationName = selectedLocationId
    ? locations.find((loc) => loc.id === selectedLocationId)?.name
    : null

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
          <Select value={selectedLocationId} onValueChange={onLocationChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select A Location">
                {selectedLocationName}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 block">Date Range</Label>
          <Select value={selectedDateRange} onValueChange={(val) => onDateRangeChange(val as any)}>
            <SelectTrigger>
              <SelectValue>{dateRangeLabels[selectedDateRange]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="last7">Last 7 Days</SelectItem>
              <SelectItem value="last30">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
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
