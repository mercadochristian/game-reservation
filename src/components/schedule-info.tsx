import { ScheduleWithLocation } from '@/types'
import { formatScheduleLabel } from '@/lib/utils/schedule-label'
import { formatScheduleDateWithWeekday, formatScheduleTime } from '@/lib/utils/timezone'

interface ScheduleInfoProps {
  schedule: ScheduleWithLocation
  compact?: boolean
  className?: string
}

export function ScheduleInfo({ schedule, compact = false, className }: ScheduleInfoProps) {
  if (compact) {
    return (
      <span className={`text-sm text-muted-foreground ${className ?? ''}`}>
        {formatScheduleLabel(schedule)}
      </span>
    )
  }

  const location = schedule.locations?.name ?? 'Unknown Location'
  const date = formatScheduleDateWithWeekday(schedule.start_time)
  const startTime = formatScheduleTime(schedule.start_time)
  const endTime = formatScheduleTime(schedule.end_time)

  return (
    <div className={className}>
      <div className="font-semibold text-foreground">{location}</div>
      <div className="text-sm text-muted-foreground">{date}</div>
      <div className="text-sm text-muted-foreground">
        {startTime} – {endTime}
      </div>
    </div>
  )
}
