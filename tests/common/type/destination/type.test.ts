import { describe, expect, it } from 'vitest'

import {
  ListingFilterEq,
  defaultAdjacentFilter,
  defaultCatalogFilter,
} from '@/common/type/destination'
import * as Listing from '@/component/listing'

describe('the equality of filters', () => {
  it('never takes the filters of two lists for the same', () => {
    expect(
      ListingFilterEq.equals(defaultCatalogFilter(), defaultCatalogFilter()),
    ).toBe(true)
    expect(
      ListingFilterEq.equals(defaultCatalogFilter(), defaultAdjacentFilter()),
    ).toBe(false)
  })

  it('compares a model of a list by the filter of that list', () => {
    const eq = Listing.mkModelEq(ListingFilterEq)
    const catalog = Listing.init(defaultCatalogFilter())
    expect(eq.equals(catalog, Listing.init(defaultCatalogFilter()))).toBe(true)
    expect(eq.equals(catalog, { ...catalog, panel: 'open' })).toBe(false)
    expect(
      eq.equals(
        catalog,
        Listing.init({ ...defaultCatalogFilter(), query: 'x' }),
      ),
    ).toBe(false)
  })
})
