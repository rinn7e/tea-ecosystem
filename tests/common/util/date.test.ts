import { describe, expect, it } from 'vitest'

import { monthYearOf } from '@/common/util'

describe('monthYearOf', () => {
  it('reads a day as its month and year', () => {
    expect(monthYearOf('2026-11-02')).toBe('Nov 2026')
    expect(monthYearOf('2012-04-19')).toBe('Apr 2012')
  })
})
