/**
 * Timezone utilities for the volleyball reservation system.
 *
 * Convention:
 *   - All times are stored in the database as UTC (timestamptz).
 *   - All times are displayed to users in Asia/Manila (UTC+8).
 *   - All times entered by admins via datetime-local inputs are treated as Manila time.
 *
 * Never sprinkle 'Asia/Manila' strings or UTC offset arithmetic directly in
 * components — use these helpers instead so the timezone source-of-truth lives
 * in one place.
 */

/** Single source of truth for the application timezone. */
export const APP_TIMEZONE = 'Asia/Manila'

// ---------------------------------------------------------------------------
// Display helpers (UTC → Manila)
// ---------------------------------------------------------------------------

/**
 * Format a UTC ISO string as a full date for display in Manila time.
 *
 * @example
 * formatScheduleDate('2026-03-20T06:30:00+00:00')
 * // → "Friday, March 20, 2026"
 */
export function formatScheduleDate(utcDate: Date | string): string {
  if (!utcDate) return ''
  try {
    return new Date(utcDate).toLocaleDateString('en-US', {
      timeZone: APP_TIMEZONE,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return String(utcDate)
  }
}

/**
 * Format a UTC ISO string as a short date (no weekday) in Manila time.
 *
 * @example
 * formatScheduleDateShort('2026-03-20T06:30:00+00:00')
 * // → "Mar 20, 2026"
 */
export function formatScheduleDateShort(utcDate: Date | string): string {
  if (!utcDate) return ''
  try {
    return new Date(utcDate).toLocaleDateString('en-US', {
      timeZone: APP_TIMEZONE,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return String(utcDate)
  }
}

/**
 * Format a UTC ISO string as a short date with abbreviated weekday in Manila time.
 *
 * @example
 * formatScheduleDateWithWeekday('2026-03-20T06:30:00+00:00')
 * // → "Fri, Mar 20"
 */
export function formatScheduleDateWithWeekday(utcDate: Date | string): string {
  if (!utcDate) return ''
  try {
    return new Date(utcDate).toLocaleDateString('en-US', {
      timeZone: APP_TIMEZONE,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return String(utcDate)
  }
}

/**
 * Format a UTC ISO string as a 12-hour time in Manila time.
 *
 * @example
 * formatScheduleTime('2026-03-20T06:30:00+00:00')
 * // → "2:30 PM"
 */
export function formatScheduleTime(utcDate: Date | string): string {
  if (!utcDate) return ''
  try {
    return new Date(utcDate).toLocaleTimeString('en-US', {
      timeZone: APP_TIMEZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return String(utcDate)
  }
}

/**
 * Format a UTC ISO string as a full date+time string in Manila time.
 * Suitable for compact admin table rows.
 *
 * @example
 * formatScheduleDateTime('2026-03-20T06:30:00+00:00')
 * // → "Mar 20, 2026, 2:30 PM"
 */
export function formatScheduleDateTime(utcDate: Date | string): string {
  if (!utcDate) return ''
  try {
    return new Date(utcDate).toLocaleString('en-US', {
      timeZone: APP_TIMEZONE,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return String(utcDate)
  }
}

/**
 * Return a "YYYY-MM-DD" date key in Manila time for a UTC ISO string.
 * Useful for grouping schedules by calendar date.
 *
 * @example
 * toManilaDateKey('2026-03-19T16:00:00+00:00')
 * // → "2026-03-20"  (midnight Manila is still March 19 in UTC)
 */
export function toManilaDateKey(utcDate: Date | string): string {
  if (!utcDate) return ''
  return new Date(utcDate).toLocaleDateString('en-CA', {
    timeZone: APP_TIMEZONE,
  }) // 'en-CA' locale always returns YYYY-MM-DD
}

/**
 * Return "today" as a "YYYY-MM-DD" key in Manila time.
 * Use for calendar highlight logic instead of `new Date()` which uses the
 * local browser timezone.
 */
export function getTodayManilaKey(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE })
}

/**
 * Return the current wall-clock time in Manila as a plain JS Date.
 * The Date object itself has no timezone, but its numeric value represents
 * "right now" — here we just use it as a calendar-anchor for computing
 * which month to show on initial render.
 *
 * IMPORTANT: Do not use this Date's `.toLocaleDateString()` without passing
 * `timeZone: APP_TIMEZONE`, otherwise the host browser's timezone will be used.
 */
export function getNowInManila(): Date {
  const now = new Date()
  // Re-parse via Manila locale string to get a Date whose .getFullYear(),
  // .getMonth(), .getDate() reflect Manila wall-clock values.
  return new Date(now.toLocaleString('en-US', { timeZone: APP_TIMEZONE }))
}

// ---------------------------------------------------------------------------
// Form helpers (Manila input → UTC storage)
// ---------------------------------------------------------------------------

/**
 * Convert a datetime-local input value (treated as Manila time) to a UTC ISO
 * string suitable for storing in Supabase.
 *
 * A datetime-local input yields "YYYY-MM-DDTHH:mm" with no timezone info.
 * We append +08:00 so the database receives the correct UTC instant.
 *
 * @example
 * manilaInputToUTC('2026-03-20T14:30')
 * // → "2026-03-20T14:30:00+08:00"
 */
export function manilaInputToUTC(datetimeLocal: string): string {
  if (!datetimeLocal) return ''
  return `${datetimeLocal}:00+08:00`
}

/**
 * Convert a UTC ISO string back to the "YYYY-MM-DDTHH:mm" format required
 * by a datetime-local input, displayed in Manila time.
 *
 * @example
 * utcToManilaInput('2026-03-20T06:30:00+00:00')
 * // → "2026-03-20T14:30"
 */
export function utcToManilaInput(utcDate: Date | string): string {
  if (!utcDate) return ''
  try {
    // Format in Manila timezone and take the first 16 chars: "YYYY-MM-DDTHH:mm"
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(utcDate))

    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
    // en-CA date is already YYYY-MM-DD; hour may be "24" for midnight in some engines
    const hour = get('hour') === '24' ? '00' : get('hour')
    return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`
  } catch {
    return ''
  }
}
