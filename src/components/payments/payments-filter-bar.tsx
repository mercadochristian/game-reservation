'use client'

import { Location } from '@/types'

interface PaymentsFilterBarProps {
  locations: Location[]
  selectedLocationId: string | null
  selectedDateRange: 'all' | 'last7' | 'last30' | 'date'
  selectedDate: string | null
  onLocationChange: (locationId: string) => void
  onDateRangeChange: (dateRange: 'all' | 'last7' | 'last30' | 'date') => void
  onDateChange: (date: string | null) => void
  extractionEnabled: boolean
}

export function PaymentsFilterBar({
  locations,
  selectedLocationId,
  selectedDateRange,
  selectedDate,
  onLocationChange,
  onDateRangeChange,
  onDateChange,
  extractionEnabled,
}: PaymentsFilterBarProps) {
  return (
    <div className="bg-card border-border border rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            extractionEnabled
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          AI Extraction: {extractionEnabled ? 'ON' : 'OFF'}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Location Select */}
        <div>
          <label htmlFor="location-select" className="block text-sm font-medium mb-2">
            Location
          </label>
          <select
            id="location-select"
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
          <label htmlFor="date-range-select" className="block text-sm font-medium mb-2">
            Date Range
          </label>
          <select
            id="date-range-select"
            value={selectedDateRange}
            onChange={(e) => onDateRangeChange(e.target.value as 'all' | 'last7' | 'last30' | 'date')}
            className="w-full px-3 py-2 bg-input border-border border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
          >
            <option value="all">All</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
            <option value="date">Select a Date</option>
          </select>
        </div>

        {/* Date Picker (shown only when dateRange = 'date') */}
        {selectedDateRange === 'date' && (
          <div>
            <label htmlFor="date-picker" className="block text-sm font-medium mb-2">
              Date
            </label>
            <input
              id="date-picker"
              type="date"
              value={selectedDate || ''}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full px-3 py-2 bg-input border-border border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
            />
          </div>
        )}
      </div>
    </div>
  )
}
