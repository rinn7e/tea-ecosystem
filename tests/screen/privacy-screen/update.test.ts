import { describe, expect, it } from 'vitest'

import { init, update } from '@/screen/privacy-screen'

describe('the update of the privacy page', () => {
  it('keeps its model on `NoOp`', () => {
    const model = init()
    expect(update({ _tag: 'NoOp' }, model)[0]).toBe(model)
  })
})
