import { type Cmd } from 'tea-cup-fp'

import { type ListingFilter } from '@/common/type/destination'
import * as Listing from '@/component/listing'

import { type Model, type Msg } from './type'

// Opened with the filter of its destination
export const init = (filter: ListingFilter): Model => ({
  listing: Listing.init(filter),
})

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'ListingMsg': {
      const [listing, listingCmd] = Listing.update(msg.subMsg, model.listing)
      return [
        { listing },
        listingCmd.map((m): Msg => ({ _tag: 'ListingMsg', subMsg: m })),
      ]
    }
  }
}
