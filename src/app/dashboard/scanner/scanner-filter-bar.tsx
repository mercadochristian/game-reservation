'use client'

import { Location } from '@/types'
import { getTodayManilaKey } from '@/lib/utils/timezone'

interface ScannerFilterBarProps {
  locations: Location[]
  selectedLocationId: string | null
  selectedDateRange: 'date' | 'date-custom'
  selectedDate: string | null
  onLocationChange: (locationId: string) => void
  onDateRangeChange: (dateRange: 'date' | 'date-custom') => void
  onDateChange: (date: string | null) => void
}

export function ScannerFilterBar({
  locations,
  selectedLocationId,
  selectedDateRange,
  selectedDate,
  onLocationChange,
  onDateRangeChange,
  onDateChange,
}: ScannerFilterBarProps) {
  const todayKey = getTodayManilaKey()

  return (
    <div className="bg-card border-border border rounded-lg p-6 mb-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Location Select */}
        <div>
          <label htmlFor="scanner-location-select" className="block text-sm font-medium mb-2">
            Location
          </label>
          <select
            id="scanner-location-select"
            value={selectedLocationId || ''}
            onChange={(e) => onLocationChange(e.target.value)}
            className="w-full px-3 py-2 bg-input border-border border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
          >
            <option value="">Select location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Select */}
        <div>
          <label htmlFor="scanner-date-range-select" className="block text-sm font-medium mb-2">
            Date Range
          </label>
          <select
            id="scanner-date-range-select"
            value={selectedDateRange}
            onChange={(e) => onDateRangeChange(e.target.value as 'date' | 'date-custom')}
            className="w-full px-3 py-2 bg-input border-border border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
          >
            <option value="date">Today</option>
            <option value="date-custom">Select a Date</option>
          </select>
        </div>

        {/* Date Picker (shown only when dateRange = 'date-custom') */}
        {selectedDateRange === 'date-custom' && (
          <div>
            <label htmlFor="scanner-date-picker" className="block text-sm font-medium mb-2">
              Date
            </label>
            <input
              id="scanner-date-picker"
              type="date"
              value={selectedDate || todayKey}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full px-3 py-2 bg-input border-border border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
            />
          </div>
        )}
      </div>
    </div>
  )
}
