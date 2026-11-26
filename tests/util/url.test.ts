import * as O from 'fp-ts/Option'
import { type ProgramListener } from 'react-tea-cup'
import { Cmd } from 'tea-cup-fp'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  adjacentScreen,
  catalogScreen,
  destinationOfScreen,
  frameworkScreen,
} from '@/common/type/destination'
import { type Model, type Msg } from '@/type'
import { update } from '@/update'
import { destinationOf, urlWriteOf, urlWriterOf } from '@/util'

import { bootOn, navigate, step } from '../helper/app'
import { fakeBrowserOn } from '../helper/browser'

const query = (q: string): Msg => ({
  _tag: 'CatalogScreenMsg',
  subMsg: { _tag: 'ListingMsg', subMsg: { _tag: 'SetQuery', query: q } },
})

describe('urlWriteOf', () => {
  it('pushes a move to another screen', () => {
    const prev = bootOn('/')
    const destination = destinationOfScreen(frameworkScreen('miso'))
    const next = navigate(prev, destination)
    const msg: Msg = {
      _tag: 'NavigationMsg',
      subMsg: { _tag: 'Navigate', destination, scrollY: 0, back: false },
    }
    expect(urlWriteOf(msg, prev, next)).toEqual(
      O.some({ _tag: 'PushUrl', url: '/framework/miso' }),
    )
  })

  it('goes back (or pushes) when a framework page closes onto the catalog', () => {
    const prev = bootOn('/framework/miso')
    const destination = destinationOfScreen(catalogScreen())
    const next = navigate(prev, destination)
    const msg: Msg = {
      _tag: 'NavigationMsg',
      subMsg: { _tag: 'Navigate', destination, scrollY: 0, back: false },
    }
    expect(urlWriteOf(msg, prev, next)).toEqual(
      O.some({ _tag: 'BackOrPushUrl', url: '/' }),
    )
  })

  it('pushes a switch from a framework page to a screen that stands alone', () => {
    const prev = bootOn('/framework/miso')
    const destination = destinationOfScreen(adjacentScreen())
    const next = navigate(prev, destination)
    const msg: Msg = {
      _tag: 'NavigationMsg',
      subMsg: { _tag: 'Navigate', destination, scrollY: 0, back: false },
    }
    expect(urlWriteOf(msg, prev, next)).toEqual(
      O.some({ _tag: 'PushUrl', url: '/adjacent' }),
    )
  })

  it('replaces while the search text is typed', () => {
    const prev = bootOn('/?tier=full')
    const msg = query('rust')
    const next = step(prev, msg)
    expect(urlWriteOf(msg, prev, next)).toEqual(
      O.some({ _tag: 'ReplaceUrl', url: '/?tier=full&query=rust' }),
    )
  })

  it('replaces while the order is changed, so Back leaves the list', () => {
    const prev = bootOn('/')
    const msg: Msg = {
      _tag: 'CatalogScreenMsg',
      subMsg: {
        _tag: 'ListingMsg',
        subMsg: {
          _tag: 'SetSort',
          sort: O.some({ column: 'stars', direction: 'descending' }),
        },
      },
    }
    const next = step(prev, msg)
    expect(urlWriteOf(msg, prev, next)).toEqual(
      O.some({ _tag: 'ReplaceUrl', url: '/?sort=stars&order=descending' }),
    )
  })

  it('pushes a change of tier', () => {
    const prev = bootOn('/')
    const msg: Msg = {
      _tag: 'CatalogScreenMsg',
      subMsg: {
        _tag: 'ListingMsg',
        subMsg: {
          _tag: 'ToggleTier',
          tier: 'superset',
          options: ['reference', 'full', 'superset'],
        },
      },
    }
    const next = step(prev, msg)
    expect(urlWriteOf(msg, prev, next)).toEqual(
      O.some({ _tag: 'PushUrl', url: '/?tier=superset' }),
    )
  })

  it('writes nothing when the browser lands on the destination shown', () => {
    const prev = bootOn('/framework/miso')
    const next = navigate(prev, destinationOfScreen(catalogScreen()))
    const landing: Msg = {
      _tag: 'NavigationMsg',
      subMsg: {
        _tag: 'UrlChanged',
        destination: destinationOf(next),
        scrollY: 0,
      },
    }
    expect(urlWriteOf(landing, next, step(next, landing))).toEqual(O.none)
  })

  it('goes back (or pushes) when an adjacent page closes onto its list', () => {
    const prev = bootOn('/framework/redux')
    const destination = destinationOfScreen(adjacentScreen())
    const next = navigate(prev, destination)
    const msg: Msg = {
      _tag: 'NavigationMsg',
      subMsg: { _tag: 'Navigate', destination, scrollY: 0, back: false },
    }
    expect(urlWriteOf(msg, prev, next)).toEqual(
      O.some({ _tag: 'BackOrPushUrl', url: '/adjacent' }),
    )
  })
})

// The program as it runs the URL writer: the model of `init` first, then
// every step right after its `update`
const started = (
  model: Model,
): { listener: ProgramListener<Model, Msg>; model: Model } => {
  const listener = urlWriterOf()
  listener({ tag: 'init', count: 0, mac: [model, Cmd.none()] })
  return { listener, model }
}

const run = (
  { listener, model }: ReturnType<typeof started>,
  msg: Msg,
): ReturnType<typeof started> => {
  const mac = update(msg, model)
  listener({ tag: 'update', count: 1, msg, mac })
  return { listener, model: mac[0] }
}

const navigateMsg = (
  destination: ReturnType<typeof destinationOfScreen>,
  scrollY: number,
  back = false,
): Msg => ({
  _tag: 'NavigationMsg',
  subMsg: { _tag: 'Navigate', destination, scrollY, back },
})

describe('urlWriterOf', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('pushes a move, and the entry it leaves keeps the scroll of the page', () => {
    const browser = fakeBrowserOn('/')
    const program = started(bootOn('/'))
    browser.scrollPageTo(1200)
    run(
      program,
      navigateMsg(destinationOfScreen(frameworkScreen('miso')), 1200),
    )
    expect(browser.entries()).toEqual([
      { path: '/', state: { scrollY: 1200 } },
      { path: '/framework/miso', state: null },
    ])
  })

  it('writes nothing when the browser lands on an entry', () => {
    const browser = fakeBrowserOn('/framework/miso')
    const program = started(bootOn('/framework/miso'))
    const landing: Msg = {
      _tag: 'NavigationMsg',
      subMsg: {
        _tag: 'UrlChanged',
        destination: destinationOfScreen(catalogScreen()),
        scrollY: 0,
      },
    }
    run(program, landing)
    expect(browser.writes()).toBe(0)
  })

  it('goes back on a link back, and the page left keeps its scroll', () => {
    const browser = fakeBrowserOn('/')
    const onList = started(bootOn('/'))
    browser.scrollPageTo(800)
    const onPage = run(
      onList,
      navigateMsg(destinationOfScreen(frameworkScreen('miso')), 800),
    )
    browser.scrollPageTo(300)
    run(onPage, navigateMsg(destinationOfScreen(catalogScreen()), 300, true))
    expect(browser.index()).toBe(0)
    expect(browser.entries()).toEqual([
      { path: '/', state: { scrollY: 800 } },
      { path: '/framework/miso', state: { scrollY: 300 } },
    ])
  })

  it('replaces while the search text is typed, and keeps the saved scroll', () => {
    const browser = fakeBrowserOn('/', { scrollY: 50 })
    run(started(bootOn('/')), query('rust'))
    expect(browser.entries()).toEqual([
      { path: '/?query=rust', state: { scrollY: 50 } },
    ])
  })
})
