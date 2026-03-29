'use client'

import type { ScheduleWithLocation, Registration } from '@/types'
import { formatDateTime } from '@/lib/utils/date'
import { POSITION_LABELS } from '@/lib/constants/labels'

interface RegisteredGameCardProps {
  schedule: ScheduleWithLocation
  registration: Registration
  onShowQR: (schedule: ScheduleWithLocation, registration: Registration) => void
}

export function RegisteredGameCard({
  schedule,
  registration,
  onShowQR,
}: RegisteredGameCardProps) {
  const positionLabel = registration.preferred_position
    ? POSITION_LABELS[registration.preferred_position]
    : 'Not specified'

  return (
    <div className="border border-border rounded-lg bg-card p-6 hover:bg-muted transition-colors dark:hover:bg-muted/50">
      {/* Date & Time */}
      <h3 className="text-lg font-bold text-foreground dark:text-white mb-4">
        {formatDateTime(schedule.start_time, 'EEE, MMM d • h:mm a')}
      </h3>

      {/* Location */}
      <div className="mb-4">
        <p className="font-medium text-foreground dark:text-white">{schedule.locations?.name}</p>
        <p className="text-sm text-muted-foreground">{schedule.locations?.address}</p>
      </div>

      {/* Position */}
      <div className="mb-6">
        <p className="text-xs text-muted-foreground mb-1">Position:</p>
        <p className="text-sm font-medium text-foreground dark:text-white">{positionLabel}</p>
      </div>

      {/* Show QR Button */}
      <button
        onClick={() => onShowQR(schedule, registration)}
        className="w-full cursor-pointer inline-flex items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap transition-all h-9 hover:opacity-90"
      >
        Show QR →
      </button>
    </div>
  )
}
