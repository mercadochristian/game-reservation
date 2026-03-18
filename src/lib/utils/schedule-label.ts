import { ScheduleWithLocation } from '@/types'
import { formatScheduleDateWithWeekday, formatScheduleTime } from './timezone'

/**
 * Format a schedule into a human-readable label: "Location · Day, Date · Start – End"
 * Example: "Downtown YMCA · Fri, Mar 20 · 7:00 PM – 9:00 PM"
 */
export function formatScheduleLabel(schedule: ScheduleWithLocation): string {
  const loc = schedule.locations?.name ?? 'Unknown Location'
  const date = formatScheduleDateWithWeekday(schedule.start_time)
  const start = formatScheduleTime(schedule.start_time)
  const end = formatScheduleTime(schedule.end_time)
  return `${loc} · ${date} · ${start} – ${end}`
}
