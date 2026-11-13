import { describe, expect, it } from 'vitest'

import {
  aboutScreen,
  catalogScreen,
  destinationOfScreen,
  frameworkScreen,
} from '@/common/type/destination'
import { type Model, type Msg } from '@/type'
import { catalogDestinationOf } from '@/util'

import { bootOn, step } from './helper/app'

// A link click at `scrollY` to the screen of `destination`
const click = (
  model: Model,
  destination: ReturnType<typeof destinationOfScreen>,
  scrollY: number,
): Model =>
  step(model, {
    _tag: 'NavigationMsg',
    subMsg: { _tag: 'Navigate', destination, scrollY },
  })

const landing = (
  destination: ReturnType<typeof destinationOfScreen>,
  scrollY: number,
): Msg => ({
  _tag: 'NavigationMsg',
  subMsg: { _tag: 'UrlChanged', destination, scrollY },
})

const miso = destinationOfScreen(frameworkScreen('miso'))

describe('where a move draws its screen', () => {
  it('draws a page opened by a link at the top', () => {
    const onPage = click(bootOn('/'), miso, 1500)
    expect(onPage.scroll.top).toBe(0)
    expect(onPage.scroll.seq).toBe(1)
  })

  it('draws the list a page closes onto at the scroll it was left at', () => {
    const onPage = click(bootOn('/'), miso, 1500)
    const back = click(onPage, catalogDestinationOf(onPage), 300)
    expect(back.screenModel._tag).toBe('CatalogScreenModel')
    expect(back.scroll).toEqual({ seq: 2, top: 1500 })
  })

  it('changes nothing when the app lands on its own back', () => {
    const onPage = click(bootOn('/'), miso, 1500)
    const back = click(onPage, catalogDestinationOf(onPage), 300)
    expect(step(back, landing(catalogDestinationOf(back), 1500))).toBe(back)
  })

  it('draws the entry the browser lands on at its saved scroll', () => {
    const onPage = click(bootOn('/'), miso, 1500)
    const back = step(onPage, landing(catalogDestinationOf(onPage), 1200))
    expect(back.scroll).toEqual({ seq: 2, top: 1200 })
  })

  it('draws a screen that stands alone at the top, even from a list', () => {
    const onAbout = click(bootOn('/'), destinationOfScreen(aboutScreen()), 900)
    expect(onAbout.scroll.top).toBe(0)
    expect(onAbout.listScrollY.catalog).toBe(900)
  })

  it('draws the catalog opened again from the bar at the top', () => {
    const filtered = bootOn('/?language=Rust')
    const reset = click(filtered, destinationOfScreen(catalogScreen()), 700)
    expect(reset.scroll.top).toBe(0)
  })
})
