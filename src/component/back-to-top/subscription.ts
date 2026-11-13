import { WindowEvents } from 'react-tea-cup'
import { type Sub } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

const windowEvents = new WindowEvents<Msg>()

// Every scroll of the page, to show or hide the button
export const subscriptions = (_model: Model): Sub<Msg> =>
  windowEvents.on(
    'scroll',
    (): Msg => ({ _tag: 'Scrolled', scrollY: window.scrollY }),
    { passive: true },
  )
