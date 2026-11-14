import { type Sub } from 'tea-cup-fp'

import * as Listing from '@/component/listing'

import { type Model, type Msg } from './type'

export const subscriptions = (model: Model): Sub<Msg> =>
  Listing.subscriptions(model.listing).map((subMsg): Msg => ({
    _tag: 'ListingMsg',
    subMsg,
  }))
