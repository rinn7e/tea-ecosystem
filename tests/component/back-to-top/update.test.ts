import { describe, expect, it } from 'vitest'

import { SHOWN_FROM, init, update } from '@/component/back-to-top'

describe('back to top', () => {
  it('is hidden at first', () => {
    expect(init().isShown).toBe(false)
  })

  it('shows once the page is scrolled past SHOWN_FROM, and hides back', () => {
    const [shown] = update(
      { _tag: 'Scrolled', scrollY: SHOWN_FROM + 1 },
      init(),
    )
    expect(shown.isShown).toBe(true)
    const [hidden] = update({ _tag: 'Scrolled', scrollY: SHOWN_FROM }, shown)
    expect(hidden.isShown).toBe(false)
  })

  it('keeps the same model while the scroll does not change it', () => {
    const model = init()
    const [next] = update({ _tag: 'Scrolled', scrollY: 10 }, model)
    expect(next).toBe(model)
  })
})
