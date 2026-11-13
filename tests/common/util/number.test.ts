import { describe, expect, it } from 'vitest'

import { starCountOf } from '@/common/util'

describe('starCountOf', () => {
  it('shows a star count the way GitHub does', () => {
    expect(starCountOf(95)).toBe('95')
    expect(starCountOf(7940)).toBe('7.9k')
    expect(starCountOf(252562)).toBe('252.6k')
    expect(starCountOf(1000)).toBe('1k')
  })
})
