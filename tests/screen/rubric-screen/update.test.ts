import { describe, expect, it } from 'vitest'

import { init, update } from '@/screen/rubric-screen'

describe('the update of the rubric', () => {
  it('keeps its model on `NoOp`', () => {
    const model = init()
    expect(update({ _tag: 'NoOp' }, model)[0]).toBe(model)
  })
})
