import * as O from 'fp-ts/Option'
import { describe, expect, it } from 'vitest'

import {
  catalogScreen,
  catalogTiers,
  choiceOf,
  destinationOfScreen,
  frameworkScreen,
  statusChoiceOf,
} from '@/common/type/destination'
import { targets } from '@/common/type/framework'
import { catalogDestinationOf, destinationOf } from '@/util'

import { bootOn, navigate, step } from './helper/app'

describe('the screen stack', () => {
  it('keeps the catalog filter under a framework page', () => {
    const filtered = bootOn('/?target=tui&query=rust')
    const onPage = navigate(
      filtered,
      destinationOfScreen(frameworkScreen('tears')),
    )
    expect(onPage.screenModel._tag).toBe('FrameworkScreenModel')
    expect(catalogDestinationOf(onPage)).toEqual(destinationOf(filtered))
  })

  it('opens Not Found for an unknown framework', () => {
    expect(bootOn('/framework/no-such-thing').screenModel._tag).toBe(
      'NotFoundScreenModel',
    )
  })

  it('opens the catalog with the filter of its destination', () => {
    const model = navigate(
      bootOn('/rubric'),
      destinationOfScreen(
        catalogScreen({
          list: 'catalog',
          tiers: choiceOf(catalogTiers, ['full']),
          targets: choiceOf(targets, []),
          statuses: statusChoiceOf(['active', 'quiet']),
          query: '',
          show: O.none,
          language: O.none,
          layout: 'table',
          sort: O.none,
        }),
      ),
    )
    expect(model.catalog.listing.filter.layout).toBe('table')
    expect(model.catalog.listing.filter.tiers).toEqual(
      choiceOf(catalogTiers, ['full']),
    )
  })

  it('ignores catalog messages while another screen covers it', () => {
    const onPage = bootOn('/framework/miso')
    const next = step(onPage, {
      _tag: 'CatalogScreenMsg',
      subMsg: { _tag: 'ListingMsg', subMsg: { _tag: 'SetQuery', query: 'x' } },
    })
    expect(next).toBe(onPage)
  })

  it('ignores adjacent messages while the catalog is shown', () => {
    const catalog = bootOn('/')
    const next = step(catalog, {
      _tag: 'AdjacentScreenMsg',
      subMsg: { _tag: 'ListingMsg', subMsg: { _tag: 'SetQuery', query: 'x' } },
    })
    expect(next).toBe(catalog)
  })

  it('hands a message of the adjacent list to its screen', () => {
    const adjacent = bootOn('/adjacent')
    const next = step(adjacent, {
      _tag: 'AdjacentScreenMsg',
      subMsg: { _tag: 'ListingMsg', subMsg: { _tag: 'SetQuery', query: 'x' } },
    })
    expect(next.adjacent.listing.filter.query).toBe('x')
    expect(next.catalog).toBe(adjacent.catalog)
  })

  it('keeps the rubric and the about page on their `NoOp`, and ignores it on another screen', () => {
    const rubric = bootOn('/rubric')
    const about = bootOn('/about')
    expect(
      step(rubric, { _tag: 'RubricScreenMsg', subMsg: { _tag: 'NoOp' } })
        .screenModel,
    ).toEqual(rubric.screenModel)
    expect(
      step(about, { _tag: 'AboutScreenMsg', subMsg: { _tag: 'NoOp' } })
        .screenModel,
    ).toEqual(about.screenModel)
    expect(
      step(rubric, { _tag: 'AboutScreenMsg', subMsg: { _tag: 'NoOp' } }),
    ).toBe(rubric)
    expect(
      step(about, { _tag: 'RubricScreenMsg', subMsg: { _tag: 'NoOp' } }),
    ).toBe(about)
  })

  it('switches the language of the guide in place', () => {
    const guide = bootOn('/build-your-own')
    const next = step(guide, {
      _tag: 'BuildScreenMsg',
      subMsg: { _tag: 'ChangeLanguage', language: 'kotlin' },
    })
    expect(destinationOf(next).screen).toEqual({
      _tag: 'BuildScreen',
      language: 'kotlin',
    })
  })
})
