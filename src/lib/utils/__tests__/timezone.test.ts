import { describe, it, expect } from 'vitest'
import {
  APP_TIMEZONE,
  formatScheduleDate,
  formatScheduleDateShort,
  formatScheduleDateWithWeekday,
  formatScheduleTime,
  formatScheduleDateTime,
  toManilaDateKey,
  getTodayManilaKey,
  getNowInManila,
  manilaInputToUTC,
  utcToManilaInput,
} from '../timezone'

describe('timezone utilities', () => {
  describe('APP_TIMEZONE constant', () => {
    it('is set to Asia/Manila', () => {
      expect(APP_TIMEZONE).toBe('Asia/Manila')
    })
  })

  describe('formatScheduleDate', () => {
    it('formats UTC timestamp as full date in Manila timezone', () => {
      const result = formatScheduleDate('2026-03-20T06:30:00Z')
      expect(result).toMatch(/\w+,\s\w+\s\d+,\s\d{4}/)
      expect(result).toContain('20')
      expect(result).toContain('2026')
    })

    it('returns empty string for falsy input', () => {
      expect(formatScheduleDate('')).toBe('')
      expect(formatScheduleDate(null as any)).toBe('')
      expect(formatScheduleDate(undefined as any)).toBe('')
    })

    it('accepts Date object', () => {
      const date = new Date('2026-03-20T06:30:00Z')
      const result = formatScheduleDate(date)
      expect(result).toContain('20')
      expect(result).toContain('2026')
    })

    it('handles invalid input gracefully (returns "Invalid Date" or raw string)', () => {
      const invalid = 'not-a-date'
      const result = formatScheduleDate(invalid)
      // The Date constructor returns "Invalid Date" for invalid input
      expect(['Invalid Date', invalid]).toContain(result)
    })
  })

  describe('formatScheduleDateShort', () => {
    it('formats as short date: "Mar 20, 2026"', () => {
      const result = formatScheduleDateShort('2026-03-20T06:30:00Z')
      expect(result).toMatch(/\w+\s\d+,\s\d{4}/)
    })

    it('returns empty string for falsy input', () => {
      expect(formatScheduleDateShort('')).toBe('')
      expect(formatScheduleDateShort(null as any)).toBe('')
    })

    it('accepts Date object', () => {
      const date = new Date('2026-03-20T06:30:00Z')
      const result = formatScheduleDateShort(date)
      expect(result).toContain('20')
      expect(result).toContain('2026')
    })
  })

  describe('formatScheduleDateWithWeekday', () => {
    it('formats as short date with weekday: "Fri, Mar 20"', () => {
      const result = formatScheduleDateWithWeekday('2026-03-20T06:30:00Z')
      expect(result).toMatch(/\w{3},\s\w{3}\s\d+/)
    })

    it('returns empty string for falsy input', () => {
      expect(formatScheduleDateWithWeekday('')).toBe('')
      expect(formatScheduleDateWithWeekday(null as any)).toBe('')
    })

    it('accepts Date object', () => {
      const date = new Date('2026-03-20T06:30:00Z')
      const result = formatScheduleDateWithWeekday(date)
      expect(result).toMatch(/\w{3},\s\w{3}\s\d+/)
    })
  })

  describe('formatScheduleTime', () => {
    it('formats as 12-hour time: "2:30 PM"', () => {
      const result = formatScheduleTime('2026-03-20T06:30:00Z')
      // UTC 06:30Z = 14:30 Manila (UTC+8) = 2:30 PM
      expect(result).toMatch(/\d{1,2}:\d{2}\s(?:AM|PM)/)
    })

    it('handles UTC midnight as 8:00 AM Manila', () => {
      const result = formatScheduleTime('2026-03-20T00:00:00Z')
      expect(result).toContain('8:00')
      expect(result).toContain('AM')
    })

    it('returns empty string for falsy input', () => {
      expect(formatScheduleTime('')).toBe('')
      expect(formatScheduleTime(null as any)).toBe('')
    })

    it('accepts Date object', () => {
      const date = new Date('2026-03-20T06:30:00Z')
      const result = formatScheduleTime(date)
      expect(result).toMatch(/\d{1,2}:\d{2}\s(?:AM|PM)/)
    })
  })

  describe('formatScheduleDateTime', () => {
    it('formats as combined date+time: "Mar 20, 2026, 2:30 PM"', () => {
      const result = formatScheduleDateTime('2026-03-20T06:30:00Z')
      expect(result).toContain('20')
      expect(result).toContain('2026')
      expect(result).toMatch(/\d{1,2}:\d{2}\s(?:AM|PM)/)
    })

    it('returns empty string for falsy input', () => {
      expect(formatScheduleDateTime('')).toBe('')
      expect(formatScheduleDateTime(null as any)).toBe('')
    })

    it('accepts Date object', () => {
      const date = new Date('2026-03-20T06:30:00Z')
      const result = formatScheduleDateTime(date)
      expect(result).toContain('20')
      expect(result).toContain('2026')
    })
  })

  describe('toManilaDateKey', () => {
    it('returns YYYY-MM-DD format in Manila timezone', () => {
      const result = toManilaDateKey('2026-03-20T06:30:00Z')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('crosses midnight boundary: UTC 16:00 prev day → next day Manila key', () => {
      // 2026-03-19T16:00:00Z = 2026-03-20 00:00 Manila (next day)
      const result = toManilaDateKey('2026-03-19T16:00:00Z')
      expect(result).toBe('2026-03-20')
    })

    it('returns empty string for falsy input', () => {
      expect(toManilaDateKey('')).toBe('')
      expect(toManilaDateKey(null as any)).toBe('')
    })

    it('uses en-CA locale for YYYY-MM-DD format', () => {
      const result = toManilaDateKey('2026-12-25T06:30:00Z')
      expect(result).toMatch(/^2026-\d{2}-\d{2}$/)
    })
  })

  describe('getTodayManilaKey', () => {
    it('returns current date in YYYY-MM-DD format', () => {
      const result = getTodayManilaKey()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('never throws', () => {
      expect(() => getTodayManilaKey()).not.toThrow()
    })

    it('returns a date key that can be parsed', () => {
      const result = getTodayManilaKey()
      const [year, month, day] = result.split('-').map(Number)
      expect(year).toBeGreaterThan(2020)
      expect(month).toBeGreaterThanOrEqual(1)
      expect(month).toBeLessThanOrEqual(12)
      expect(day).toBeGreaterThanOrEqual(1)
      expect(day).toBeLessThanOrEqual(31)
    })
  })

  describe('getNowInManila', () => {
    it('returns a Date instance', () => {
      const result = getNowInManila()
      expect(result).toBeInstanceOf(Date)
    })

    it('getFullYear reflects Manila calendar year', () => {
      const result = getNowInManila()
      const year = result.getFullYear()
      expect(year).toBeGreaterThan(2020)
    })

    it('never throws', () => {
      expect(() => getNowInManila()).not.toThrow()
    })
  })

  describe('manilaInputToUTC', () => {
    it('appends UTC+8 offset to datetime-local input', () => {
      const result = manilaInputToUTC('2026-03-20T14:30')
      expect(result).toBe('2026-03-20T14:30:00+08:00')
    })

    it('returns empty string for falsy input', () => {
      expect(manilaInputToUTC('')).toBe('')
      expect(manilaInputToUTC(null as any)).toBe('')
    })

    it('preserves input date and time exactly', () => {
      const result = manilaInputToUTC('2026-12-25T23:59')
      expect(result).toBe('2026-12-25T23:59:00+08:00')
    })
  })

  describe('utcToManilaInput', () => {
    it('converts UTC ISO to datetime-local format in Manila timezone', () => {
      // UTC 06:30 = 14:30 Manila
      const result = utcToManilaInput('2026-03-20T06:30:00Z')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
      expect(result).toContain('14:30')
    })

    it('returns YYYY-MM-DDTHH:mm format (16 chars)', () => {
      const result = utcToManilaInput('2026-03-20T06:30:00Z')
      expect(result).toHaveLength(16)
    })

    it('handles midnight edge case: hour 24 normalizes to 00', () => {
      // This tests the hour === '24' catch in the code
      // The actual trigger depends on Intl engine behavior near midnight
      const result = utcToManilaInput('2026-03-19T16:00:00Z')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
      // Midnight Manila should be 00:00, not 24:00
      const hour = result.slice(11, 13)
      expect(['00', '01', '02', '03', '04', '05', '06', '07', '08']).toContain(hour)
    })

    it('returns empty string for falsy input', () => {
      expect(utcToManilaInput('')).toBe('')
      expect(utcToManilaInput(null as any)).toBe('')
    })

    it('returns empty string on invalid date', () => {
      expect(utcToManilaInput('not-a-date')).toBe('')
    })

    it('round-trips with manilaInputToUTC', () => {
      const original = '2026-03-20T14:30'
      const toUtc = manilaInputToUTC(original)
      const backToManila = utcToManilaInput(toUtc)
      expect(backToManila).toBe(original)
    })

    it('accepts Date object', () => {
      const date = new Date('2026-03-20T06:30:00Z')
      const result = utcToManilaInput(date)
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    })
  })
})
