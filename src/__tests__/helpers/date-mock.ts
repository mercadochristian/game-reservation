import { formatScheduleDate } from '@/lib/utils/timezone'

/**
 * Returns a UTC ISO string N days in the future from now.
 * Use for mock `start_time` values that must stay in the future.
 */
export function futureDateISO(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

/**
 * Returns a UTC ISO string N days in the past from now.
 * Use for mock `start_time` values that must stay in the past.
 */
export function pastDateISO(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

/**
 * Formats a UTC ISO string exactly as the UI will display it (Manila tz, long weekday).
 * Use this to derive assertion strings from mock data instead of hardcoding them.
 *
 * @example
 * const start = futureDateISO(1)
 * expect(screen.getByText(new RegExp(formatExpectedScheduleDate(start)))).toBeInTheDocument()
 */
export function formatExpectedScheduleDate(utcISO: string): string {
  return formatScheduleDate(utcISO)
}
