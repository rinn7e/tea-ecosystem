import * as O from 'fp-ts/Option'
import { describe, expect, it } from 'vitest'

import {
  catalogScreen,
  destinationOfScreen,
  frameworkScreen,
} from '@/common/type/destination'
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
          tiers: ['full'],
          lacks: [],
          targets: [],
          statuses: ['active', 'quiet'],
          query: '',
          show: O.none,
          language: O.none,
          layout: 'table',
          sort: O.none,
        }),
      ),
    )
    expect(model.catalog.filter.layout).toBe('table')
    expect(model.catalog.filter.tiers).toEqual(['full'])
  })

  it('ignores catalog messages while another screen covers it', () => {
    const onPage = bootOn('/framework/miso')
    const next = step(onPage, {
      _tag: 'CatalogScreenMsg',
      subMsg: { _tag: 'SetQuery', query: 'x' },
    })
    expect(next).toBe(onPage)
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
