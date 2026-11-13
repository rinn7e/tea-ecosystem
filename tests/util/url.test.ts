import * as O from 'fp-ts/Option'
import { describe, expect, it } from 'vitest'

import {
  adjacentScreen,
  catalogScreen,
  destinationOfScreen,
  frameworkScreen,
} from '@/common/type/destination'
import { type Msg } from '@/type'
import { destinationOf, urlWriteOf } from '@/util'

import { bootOn, navigate, step } from '../helper/app'

const query = (q: string): Msg => ({
  _tag: 'CatalogScreenMsg',
  subMsg: { _tag: 'SetQuery', query: q },
})

describe('urlWriteOf', () => {
  it('pushes a move to another screen', () => {
    const prev = bootOn('/')
    const destination = destinationOfScreen(frameworkScreen('miso'))
    const next = navigate(prev, destination)
    const msg: Msg = {
      _tag: 'NavigationMsg',
      subMsg: { _tag: 'Navigate', destination },
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
      subMsg: { _tag: 'Navigate', destination },
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
      subMsg: { _tag: 'Navigate', destination },
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

  it('pushes a change of tier', () => {
    const prev = bootOn('/')
    const msg: Msg = {
      _tag: 'CatalogScreenMsg',
      subMsg: { _tag: 'SetTier', tier: O.some('superset') },
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
      subMsg: { _tag: 'UrlChanged', destination: destinationOf(next) },
    }
    expect(urlWriteOf(landing, next, step(next, landing))).toEqual(O.none)
  })

  it('goes back (or pushes) when an adjacent page closes onto its list', () => {
    const prev = bootOn('/framework/redux')
    const destination = destinationOfScreen(adjacentScreen())
    const next = navigate(prev, destination)
    const msg: Msg = {
      _tag: 'NavigationMsg',
      subMsg: { _tag: 'Navigate', destination },
    }
    expect(urlWriteOf(msg, prev, next)).toEqual(
      O.some({ _tag: 'BackOrPushUrl', url: '/adjacent' }),
    )
  })
})
