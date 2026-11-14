import { fc, test } from '@fast-check/vitest'
import { isDeepStrictEqual } from 'node:util'
import { describe, expect } from 'vitest'

import { ListingFilterEq, ListingSortEq } from '@/common/type/destination'

import {
  adjacentFilterArb,
  catalogFilterArb,
  listingFilterArb,
  pairArb,
  sortRecordArb,
} from '../../../helper/arbitrary'

describe('the equality of a sort', () => {
  test.prop([pairArb(sortRecordArb)])(
    'agrees with deep equality, the direction too',
    ([x, y]) => {
      expect(ListingSortEq.equals(x, y)).toBe(isDeepStrictEqual(x, y))
    },
  )
})

describe('the equality of filters', () => {
  // Equal filters, filters one field apart on the same list, and filters
  // drawn apart (of two lists too): a wrong `Eq` of a field shows here
  test.prop([
    fc.oneof(
      pairArb(catalogFilterArb),
      pairArb(adjacentFilterArb),
      fc.tuple(listingFilterArb, listingFilterArb),
    ),
  ])('agrees with deep equality, across both lists', ([x, y]) => {
    expect(ListingFilterEq.equals(x, y)).toBe(isDeepStrictEqual(x, y))
  })
})
