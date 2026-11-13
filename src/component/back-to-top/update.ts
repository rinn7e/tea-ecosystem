import { cmdSucceed } from '@rinn7e/tea-cup-prelude'
import { Cmd } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

// How far down the page (in px) the button shows
export const SHOWN_FROM = 480

export const init = (): Model => ({ isShown: false })

// A smooth scroll, or a jump for those who ask for less motion
const scrollToTopCmd = (): Cmd<Msg> =>
  cmdSucceed(() => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    })
  })

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'NoOp':
      return [model, Cmd.none()]
    // The same model while nothing changes, so a scroll draws nothing new
    case 'Scrolled':
      return [
        msg.scrollY > SHOWN_FROM === model.isShown
          ? model
          : { isShown: msg.scrollY > SHOWN_FROM },
        Cmd.none(),
      ]
    case 'ScrollToTop':
      return [model, scrollToTopCmd()]
  }
}
