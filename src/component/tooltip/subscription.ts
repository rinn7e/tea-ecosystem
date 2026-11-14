import * as O from 'fp-ts/Option'
import { WindowEvents } from 'react-tea-cup'
import { Sub } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

const windowEvents = new WindowEvents<Msg>()

// Anything that moves the page under the tooltip closes it: a scroll (of
// the page or of a box such as the table, caught in the capture phase) or a
// resize
export const subscriptions = (model: Model): Sub<Msg> =>
  O.isNone(model.tooltip)
    ? Sub.none()
    : Sub.batch([
        windowEvents.on('keydown', (e): Msg => ({
          _tag: 'KeyDown',
          key: e.key,
        })),
        windowEvents.on('scroll', (): Msg => ({ _tag: 'Dismiss' }), {
          capture: true,
          passive: true,
        }),
        windowEvents.on('resize', (): Msg => ({ _tag: 'Dismiss' })),
        windowEvents.on('pointerdown', (): Msg => ({ _tag: 'Dismiss' })),
      ])
