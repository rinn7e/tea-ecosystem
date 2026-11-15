import { describe, expect, it } from 'vitest'

import { starCountOf, starsLabelOf } from '@/common/util'

describe('starCountOf', () => {
  it('shows a star count the way GitHub does', () => {
    expect(starCountOf(95)).toBe('95')
    expect(starCountOf(7940)).toBe('7.9k')
    expect(starCountOf(252562)).toBe('252.6k')
    expect(starCountOf(1000)).toBe('1k')
    expect(starCountOf(8)).toBe('8')
    expect(starCountOf(999)).toBe('999')
    expect(starCountOf(1240)).toBe('1.2k')
  })
})

describe('starsLabelOf', () => {
  it('says the count with its word, one star alone', () => {
    expect(starsLabelOf(0)).toBe('0 stars')
    expect(starsLabelOf(1)).toBe('1 star')
    expect(starsLabelOf(8)).toBe('8 stars')
    expect(starsLabelOf(1240)).toBe('1.2k stars')
  })
})
