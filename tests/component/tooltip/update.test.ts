import * as O from 'fp-ts/Option'
import { describe, expect, it } from 'vitest'

import {
  type Anchor,
  type Content,
  LEGEND_WIDTH,
  type Model,
  type Msg,
  WIDTH,
  init,
  placementOf,
  update,
} from '@/component/tooltip'

const anchor: Anchor = {
  top: 300,
  bottom: 326,
  left: 400,
  right: 440,
  viewportWidth: 1000,
}
const content: Content = { title: 'Sub: Managed', text: 'A managed source.' }

const hover = (id: string): Msg => ({ _tag: 'Hover', id, anchor, content })

// Runs the messages in order, keeping only the model
const run = (msgs: Msg[], start: Model = init()): Model =>
  msgs.reduce((model, msg) => update(msg, model)[0], start)

const phaseOf = (model: Model) =>
  O.toUndefined(O.map((t: { phase: string }) => t.phase)(model.tooltip))

describe('tooltip', () => {
  it('waits for the delay before it shows', () => {
    const waiting = run([hover('a')])
    expect(phaseOf(waiting)).toBe('waiting')
    const shown = run([{ _tag: 'DelayElapsed', seq: waiting.seq }], waiting)
    expect(phaseOf(shown)).toBe('shown')
  })

  it('ignores a delay started for an older hover', () => {
    const first = run([hover('a')])
    const second = run([hover('b')], first)
    const late = run([{ _tag: 'DelayElapsed', seq: first.seq }], second)
    expect(phaseOf(late)).toBe('waiting')
  })

  it('shows the next one at once while warm, until the cool down', () => {
    const shown = run([
      hover('a'),
      { _tag: 'DelayElapsed', seq: 1 },
      { _tag: 'Leave', id: 'a' },
    ])
    expect(phaseOf(shown)).toBe('leaving')
    expect(shown.warm).toBe(true)
    expect(phaseOf(run([hover('b')], shown))).toBe('shown')
    const cooled = run([{ _tag: 'CooledDown', seq: shown.seq }], shown)
    expect(cooled.warm).toBe(false)
    expect(phaseOf(run([hover('b')], cooled))).toBe('waiting')
  })

  it('fades out before it leaves, and a late removal does nothing', () => {
    const leaving = run([
      hover('a'),
      { _tag: 'DelayElapsed', seq: 1 },
      { _tag: 'Leave', id: 'a' },
    ])
    expect(phaseOf(leaving)).toBe('leaving')
    expect(
      O.isNone(run([{ _tag: 'Removed', seq: leaving.seq }], leaving).tooltip),
    ).toBe(true)
    const next = run([hover('b')], leaving)
    expect(run([{ _tag: 'Removed', seq: leaving.seq }], next)).toEqual(next)
  })

  it('drops a tooltip still waiting at once when the pointer leaves', () => {
    const left = run([hover('a'), { _tag: 'Leave', id: 'a' }])
    expect(O.isNone(left.tooltip)).toBe(true)
  })

  it('leaves only the tooltip of the trigger left', () => {
    const waiting = run([hover('a')])
    expect(run([{ _tag: 'Leave', id: 'b' }], waiting)).toEqual(waiting)
  })

  it('opens on a tap at once, and closes on a second tap', () => {
    const tap: Msg = { _tag: 'Tap', id: 'a', anchor, content }
    const open = run([tap])
    expect(phaseOf(open)).toBe('shown')
    expect(phaseOf(run([tap], open))).toBe('leaving')
  })

  it('fades out on Escape, goes at once on dismiss, ignores other keys', () => {
    const open = run([hover('a'), { _tag: 'DelayElapsed', seq: 1 }])
    expect(run([{ _tag: 'KeyDown', key: 'a' }], open)).toEqual(open)
    expect(phaseOf(run([{ _tag: 'KeyDown', key: 'Escape' }], open))).toBe(
      'leaving',
    )
    expect(O.isNone(run([{ _tag: 'Dismiss' }], open).tooltip)).toBe(true)
  })
})

describe('placementOf', () => {
  it('sits above the trigger, centred on it', () => {
    const placement = placementOf(anchor)
    expect(placement.side).toBe('above')
    expect(placement.left).toBe(420 - WIDTH / 2)
    expect(placement.arrowLeft).toBe(WIDTH / 2)
  })

  it('opens below near the top, and stays on the screen at the edges', () => {
    const nearTop = placementOf({ ...anchor, top: 40, bottom: 66 })
    expect(nearTop.side).toBe('below')
    expect(nearTop.top).toBe(66 + 8)
    const atRight = placementOf({ ...anchor, left: 960, right: 990 })
    expect(atRight.left).toBe(1000 - 8 - WIDTH)
    expect(atRight.arrowLeft).toBe(975 - (1000 - 8 - WIDTH))
  })

  it('widens for a legend, and needs more room above for it', () => {
    const withLegend = placementOf(anchor, true)
    expect(withLegend.side).toBe('below')
    expect(withLegend.left).toBe(420 - LEGEND_WIDTH / 2)
    const lower = placementOf({ ...anchor, top: 500, bottom: 526 }, true)
    expect(lower.side).toBe('above')
  })
})
