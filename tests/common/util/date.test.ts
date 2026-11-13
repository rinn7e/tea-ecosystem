import { describe, expect, it } from 'vitest'

import { dayMonthYearOf, monthYearOf } from '@/common/util'

describe('dayMonthYearOf', () => {
  it('reads a day as its day, month and year', () => {
    expect(dayMonthYearOf('2026-11-02')).toBe('2 Nov 2026')
    expect(dayMonthYearOf('2012-04-19')).toBe('19 Apr 2012')
  })
})

describe('monthYearOf', () => {
  it('reads a day as its month and year', () => {
    expect(monthYearOf('2026-11-02')).toBe('Nov 2026')
    expect(monthYearOf('2012-04-19')).toBe('Apr 2012')
  })
})
