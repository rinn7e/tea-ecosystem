import { test } from '@fast-check/vitest'
import { isDeepStrictEqual } from 'node:util'
import { describe, expect } from 'vitest'

import { ListingFilterEq } from '@/common/type/destination'

import { listingFilterArb } from '../../../helper/arbitrary'

describe('the equality of filters', () => {
  // Two filters of different lists are never equal, and a field left out
  // of the `Eq` of a list shows here
  test.prop([listingFilterArb, listingFilterArb])(
    'agrees with deep equality, across both lists',
    (x, y) => {
      expect(ListingFilterEq.equals(x, y)).toBe(isDeepStrictEqual(x, y))
    },
  )
})
