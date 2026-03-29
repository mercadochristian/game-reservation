'use client'

import Link from 'next/link'
import type { ScheduleWithLocation } from '@/types'
import { formatDateTime } from '@/lib/utils/date'
import { getPositionBreakdown } from '@/lib/utils/position-slots'

interface FeaturedGameCardProps {
  schedule: ScheduleWithLocation & {
    registrations_count: number
    position_counts: Record<string, number>
  }
}

export function FeaturedGameCard({ schedule }: FeaturedGameCardProps) {
  const spotsRemaining = schedule.max_players - schedule.registrations_count
  const isLowSpots = spotsRemaining > 0 && spotsRemaining <= 2
  const isFull = spotsRemaining <= 0

  let spotText: string
  if (isFull) {
    spotText = 'Full'
  } else if (spotsRemaining === 1) {
    spotText = '1 spot left'
  } else {
    spotText = `${spotsRemaining} spots left`
  }

  // Get position availability
  const positionBreakdown = getPositionBreakdown(schedule.num_teams ?? 1, schedule.position_counts)
  const positionText = positionBreakdown
    .map(pos => `${pos.label.split(' ')[0]}: ${pos.available}`)
    .join(' • ')

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

      {/* Position Availability */}
      <div className="mb-6">
        <p className="text-xs text-muted-foreground mb-1">Available per position:</p>
        <p className="text-sm font-medium text-foreground dark:text-white">
          {positionText}
        </p>
      </div>

      {/* Spots & Register */}
      <div className="flex items-end justify-between">
        <p className={`text-sm font-medium ${isLowSpots ? 'text-destructive dark:text-red-400' : 'text-muted-foreground'}`}>
          {spotText}
        </p>
        {isFull ? (
          <span className="inline-flex items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground text-sm font-medium whitespace-nowrap h-8 px-3">
            Full
          </span>
        ) : (
          <Link
            href={`/register?schedule_id=${schedule.id}`}
            className="cursor-pointer inline-flex items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap transition-all h-8 px-3 hover:opacity-90"
          >
            Register →
          </Link>
        )}
      </div>
    </div>
  )
}
