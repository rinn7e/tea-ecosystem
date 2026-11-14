import { WindowEvents } from 'react-tea-cup'
import { type Sub } from 'tea-cup-fp'

import { pageScrollTop } from '@/common/util'

import { type Model, type Msg } from './type'

const windowEvents = new WindowEvents<Msg>()

// The page scrolls in its own box, whose scroll does not bubble to the
// window: it is caught in the capture phase (a scroll of a box inside the
// page, such as the table, reads the same top of the page)
export const subscriptions = (_model: Model): Sub<Msg> =>
  windowEvents.on(
    'scroll',
    (): Msg => ({ _tag: 'Scrolled', scrollY: pageScrollTop() }),
    { capture: true, passive: true },
  )
