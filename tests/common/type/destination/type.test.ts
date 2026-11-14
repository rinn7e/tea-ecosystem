import * as O from 'fp-ts/Option'
import { describe, expect, it } from 'vitest'

import {
  AdjacentFilterEq,
  CatalogFilterEq,
  ListingFilterEq,
  catalogTiers,
  choiceOf,
  defaultAdjacentFilter,
  defaultCatalogFilter,
  lackables,
} from '@/common/type/destination'

describe('the equality of filters', () => {
  it('never takes the filters of two lists for the same', () => {
    expect(
      ListingFilterEq.equals(defaultCatalogFilter(), defaultCatalogFilter()),
    ).toBe(true)
    expect(
      ListingFilterEq.equals(defaultCatalogFilter(), defaultAdjacentFilter()),
    ).toBe(false)
  })

  it('tells apart filters that differ in one filter of their own list', () => {
    const catalog = defaultCatalogFilter()
    const adjacent = defaultAdjacentFilter()
    expect(
      CatalogFilterEq.equals(catalog, {
        ...catalog,
        tiers: choiceOf(catalogTiers, ['full']),
      }),
    ).toBe(false)
    expect(
      CatalogFilterEq.equals(catalog, {
        ...catalog,
        show: O.some('languages'),
      }),
    ).toBe(false)
    expect(
      AdjacentFilterEq.equals(adjacent, {
        ...adjacent,
        lacks: choiceOf(lackables, ['cmd']),
      }),
    ).toBe(false)
    expect(
      AdjacentFilterEq.equals(adjacent, { ...adjacent, query: 'redux' }),
    ).toBe(false)
  })
})
