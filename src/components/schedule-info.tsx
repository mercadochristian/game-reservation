import { memo } from 'react'
import { MapPin } from 'lucide-react'
import { ScheduleWithLocation } from '@/types'
import { formatScheduleLabel } from '@/lib/utils/schedule-label'
import { formatScheduleDateWithWeekday, formatScheduleTime } from '@/lib/utils/timezone'

interface ScheduleInfoProps {
  schedule: ScheduleWithLocation
  compact?: boolean
  className?: string
}

export const ScheduleInfo = memo(function ScheduleInfo({ schedule, compact = false, className }: ScheduleInfoProps) {
  if (compact) {
    return (
      <span className={`text-sm text-muted-foreground ${className ?? ''}`}>
        {formatScheduleLabel(schedule)}
      </span>
    )
  }

  const location = schedule.locations?.name ?? 'Unknown Location'
  const googleMapUrl = schedule.locations?.google_map_url
  const address = schedule.locations?.address
  const date = formatScheduleDateWithWeekday(schedule.start_time)
  const startTime = formatScheduleTime(schedule.start_time)
  const endTime = formatScheduleTime(schedule.end_time)

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <div className="font-semibold text-foreground">{location}</div>
        {googleMapUrl && (
          <a
            href={googleMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`View ${location} on Google Maps`}
            className="inline-flex cursor-pointer text-muted-foreground hover:text-primary transition-colors"
          >
            <MapPin size={16} />
          </a>
        )}
      </div>
      {address && <div className="text-xs text-muted-foreground mt-0.5">{address}</div>}
      <div className="text-sm text-muted-foreground mt-1">{date}</div>
      <div className="text-sm text-muted-foreground">
        {startTime} – {endTime}
      </div>
    </div>
  )
})
