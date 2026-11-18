import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { isMacSafari } from '@/common/util'

const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15'

describe('isMacSafari', () => {
  it('knows Safari on a Mac', () => {
    expect(isMacSafari(SAFARI_MAC, 0)).toBe(true)
  })

  it('tells the other browsers of a Mac, a phone and a tablet apart', () => {
    const others = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    ]
    expect(others.filter((agent) => isMacSafari(agent, 0))).toEqual([])
  })

  it('never takes a device with a touch screen for a Mac', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.integer({ min: 1, max: 10 }),
        (agent, touches) =>
          !isMacSafari(agent, touches) && !isMacSafari(SAFARI_MAC, touches),
      ),
    )
  })
})
