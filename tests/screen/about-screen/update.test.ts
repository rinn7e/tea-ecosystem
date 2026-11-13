import { describe, expect, it } from 'vitest'

import { init, update } from '@/screen/about-screen'

describe('the update of the about page', () => {
  it('keeps its model on `NoOp`', () => {
    const model = init()
    expect(update({ _tag: 'NoOp' }, model)[0]).toBe(model)
  })
})
