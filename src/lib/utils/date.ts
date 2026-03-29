import { APP_TIMEZONE } from './timezone'

/**
 * Format a UTC ISO string with a custom format string in Manila time.
 * Supports a subset of date-fns format tokens:
 *   EEE    - Abbreviated weekday name (Mon, Tue, Wed, etc.)
 *   MMM    - Abbreviated month name (Jan, Feb, Mar, etc.)
 *   d      - Day of month (1-31)
 *   h      - Hour (1-12)
 *   mm     - Minutes (00-59)
 *   a      - AM/PM
 *
 * @example
 * formatDateTime('2026-03-31T19:00:00Z', 'EEE, MMM d • h:mm a')
 * // → "Tue, Mar 31 • 7:00 PM" (in Manila time)
 */
export function formatDateTime(utcDate: Date | string, format: string): string {
  if (!utcDate) return ''

  try {
    const date = new Date(utcDate)

    // Get date parts in Manila timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIMEZONE,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    const parts = formatter.formatToParts(date)
    const partMap = new Map(parts.map((p) => [p.type, p.value]))

    // Replace tokens using placeholders to avoid conflicts
    // This prevents 'a' in 'dayPeriod' from matching 'a' token
    let result = format
      .replaceAll('EEE', `\x00WEEKDAY\x00`)
      .replaceAll('MMM', `\x00MONTH\x00`)
      .replaceAll('mm', `\x00MINUTE\x00`)
      .replaceAll('h', `\x00HOUR\x00`)
      .replaceAll('a', `\x00DAYPERIOD\x00`)
      .replaceAll('d', `\x00DAY\x00`)

    // Now replace placeholders with actual values
    result = result
      .replaceAll(`\x00WEEKDAY\x00`, partMap.get('weekday') || '')
      .replaceAll(`\x00MONTH\x00`, partMap.get('month') || '')
      .replaceAll(`\x00MINUTE\x00`, partMap.get('minute') || '')
      .replaceAll(`\x00HOUR\x00`, partMap.get('hour') || '')
      .replaceAll(`\x00DAYPERIOD\x00`, partMap.get('dayPeriod') || '')
      .replaceAll(`\x00DAY\x00`, partMap.get('day') || '')

    return result
  } catch {
    return String(utcDate)
  }
}
