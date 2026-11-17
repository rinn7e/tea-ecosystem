import { cmdSucceed } from '@rinn7e/tea-cup-prelude'
import { Cmd } from 'tea-cup-fp'

import { scrollPageTo } from '@/common/util'

import { type Model, type Msg } from './type'

// How far down the page (in px) the button shows
export const SHOWN_FROM = 480

export const init = (): Model => ({ isShown: false, glides: true })

// The button for a page a move opens at `top`: shown at once when that
// scroll is past `SHOWN_FROM` (a list returned to), with no fade
export const placedAt = (top: number): Model => ({
  isShown: top > SHOWN_FROM,
  glides: false,
})

const scrollToTopCmd = (): Cmd<Msg> =>
  cmdSucceed(() => {
    scrollPageTo(
      0,
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    )
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
          : { isShown: msg.scrollY > SHOWN_FROM, glides: true },
        Cmd.none(),
      ]
    case 'ScrollToTop':
      return [model, scrollToTopCmd()]
  }
}
