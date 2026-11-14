import { fc, test } from '@fast-check/vitest'
import { isDeepStrictEqual } from 'node:util'
import { describe, expect } from 'vitest'

import { ListingFilterEq } from '@/common/type/destination'
import { type Model, mkModelEq } from '@/component/listing'

import { listingFilterArb } from '../../helper/arbitrary'

const modelArb = fc.record(
  {
    filter: listingFilterArb,
    panel: fc.constantFrom<Model<never>['panel']>('closed', 'open', 'closing'),
    panelSeq: fc.nat(3),
  },
  { noNullPrototype: true },
)

describe('mkModelEq', () => {
  test.prop([modelArb, modelArb])(
    'agrees with deep equality, from the Eq of the filter',
    (x, y) => {
      expect(mkModelEq(ListingFilterEq).equals(x, y)).toBe(
        isDeepStrictEqual(x, y),
      )
    },
  )
})
