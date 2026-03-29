'use client'

import Link from 'next/link'
import type { ScheduleWithLocation } from '@/types'
import { formatDateTime } from '@/lib/utils/date'

interface FeaturedGameCardProps {
  schedule: ScheduleWithLocation & { registrations_count: number }
}

export function FeaturedGameCard({ schedule }: FeaturedGameCardProps) {
  const spotsRemaining = schedule.max_players - schedule.registrations_count
  const isLowSpots = spotsRemaining <= 2
  const spotText = spotsRemaining === 1 ? '1 spot left' : `${spotsRemaining} spots left`

  return (
    <div className="border border-border rounded-lg bg-white p-6 hover:bg-gray-50 transition-colors">
      {/* Date & Time */}
      <h3 className="text-lg font-bold text-foreground mb-4">
        {formatDateTime(schedule.start_time, 'EEE, MMM d • h:mm a')}
      </h3>

      {/* Location */}
      <div className="mb-6">
        <p className="font-medium text-foreground">{schedule.locations?.name}</p>
        <p className="text-sm text-muted-foreground">{schedule.locations?.address}</p>
      </div>

      {/* Spots & Register */}
      <div className="flex items-end justify-between">
        <p className={`text-sm font-medium ${isLowSpots ? 'text-red-500' : 'text-muted-foreground'}`}>
          {spotText}
        </p>
        <Link
          href={`/register?schedule_id=${schedule.id}`}
          className="inline-flex items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap transition-all h-8 px-3 hover:opacity-90"
        >
          Register →
        </Link>
      </div>
    </div>
  )
}
