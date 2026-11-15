import * as RD from '@devexperts/remote-data-ts'
import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { err, ok } from 'tea-cup-fp'
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
import { type Model } from '@/type'
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

describe('the star count of the repository', () => {
  it('waits for it at start, and keeps it once GitHub answers', () => {
    const booted = bootOn('/')
    expect(RD.isPending(booted.repoStars)).toBe(true)
    const loaded = step(booted, {
      _tag: 'GotRepoStars',
      result: ok(8),
    })
    expect(loaded.repoStars).toEqual(RD.success(8))
  })

  it('keeps no count when GitHub refuses, so the bar shows none', () => {
    const failed = step(bootOn('/'), {
      _tag: 'GotRepoStars',
      result: err(new Error('GitHub answered 403')),
    })
    expect(failed.repoStars).toEqual(RD.failure('GitHub answered 403'))
  })

  it('keeps the count across a move', () => {
    const loaded = step(bootOn('/'), {
      _tag: 'GotRepoStars',
      result: ok(8),
    })
    expect(
      navigate(loaded, destinationOfScreen(frameworkScreen('tears'))).repoStars,
    ).toEqual(RD.success(8))
  })
})

describe('the status of an entry', () => {
  // Long after the last push of Elm, which is archived then
  const LATE = Date.parse('2100-01-01T00:00:00Z')

  const pageStatusOf = (model: Model) =>
    model.screenModel._tag === 'FrameworkScreenModel'
      ? O.some(model.screenModel.model.framework.status)
      : O.none

  const listStatusOf = (model: Model) =>
    pipe(
      model.entries.catalog,
      A.findFirst((f) => f.id === 'elm'),
      O.map((f) => f.status),
    )

  it('compares the last push with the time the site loaded', () => {
    expect(listStatusOf(bootOn('/', 0))).toEqual(O.some('active'))
    expect(listStatusOf(bootOn('/', LATE))).toEqual(O.some('archived'))
    expect(pageStatusOf(bootOn('/framework/elm', LATE))).toEqual(
      O.some('archived'),
    )
  })

  it('opens an entry page with the status of the lists', () => {
    const late = bootOn('/', LATE)
    const onPage = navigate(late, destinationOfScreen(frameworkScreen('elm')))
    expect(pageStatusOf(onPage)).toEqual(O.some('archived'))
    expect(onPage.entries).toBe(late.entries)
  })
})
