import { describe, expect, it } from 'vitest'

import { dayMonthYearOf, monthYearOf, relativeTimeOf } from '@/common/util'

describe('dayMonthYearOf', () => {
  it('reads a day as its day, month and year', () => {
    expect(dayMonthYearOf('2026-11-02')).toBe('2 Nov 2026')
    expect(dayMonthYearOf('2012-04-19')).toBe('19 Apr 2012')
  })

  it('reads the day of a full time', () => {
    expect(dayMonthYearOf('2026-11-13T09:41:00+07:00')).toBe('13 Nov 2026')
  })
})

describe('monthYearOf', () => {
  it('reads a day as its month and year', () => {
    expect(monthYearOf('2026-11-02')).toBe('Nov 2026')
    expect(monthYearOf('2012-04-19')).toBe('Apr 2012')
  })
})

describe('relativeTimeOf', () => {
  const time = '2026-11-13T09:00:00Z'
  const at = (ms: number) => relativeTimeOf(time, Date.parse(time) + ms)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  it('says just now under a minute, and for a time ahead of the clock', () => {
    expect(at(0)).toBe('just now')
    expect(at(59_000)).toBe('just now')
    expect(at(-5 * minute)).toBe('just now')
  })

  it('counts the largest whole unit, singular for one', () => {
    expect(at(minute)).toBe('1 minute ago')
    expect(at(59 * minute)).toBe('59 minutes ago')
    expect(at(hour)).toBe('1 hour ago')
    expect(at(23 * hour)).toBe('23 hours ago')
    expect(at(day)).toBe('1 day ago')
    expect(at(6 * day)).toBe('6 days ago')
    expect(at(7 * day)).toBe('1 week ago')
    expect(at(29 * day)).toBe('4 weeks ago')
    expect(at(30 * day)).toBe('1 month ago')
    expect(at(364 * day)).toBe('12 months ago')
    expect(at(365 * day)).toBe('1 year ago')
    expect(at(800 * day)).toBe('2 years ago')
  })

  it('has a compact form for a narrow screen', () => {
    const short = (ms: number) =>
      relativeTimeOf(time, Date.parse(time) + ms, true)
    expect(short(0)).toBe('now')
    expect(short(5 * minute)).toBe('5m ago')
    expect(short(3 * hour)).toBe('3h ago')
    expect(short(2 * day)).toBe('2d ago')
    expect(short(21 * day)).toBe('3w ago')
    expect(short(120 * day)).toBe('4mo ago')
    expect(short(365 * day)).toBe('1y ago')
  })

  it('says nothing for a time it cannot read', () => {
    expect(relativeTimeOf('', 0)).toBe('')
  })
})
