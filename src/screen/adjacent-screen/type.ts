import { EqAlways } from '@rinn7e/tea-cup-prelude'
import * as EqClass from 'fp-ts/Eq'
import * as N from 'fp-ts/number'
import * as S from 'fp-ts/string'
import { type Dispatcher } from 'tea-cup-fp'

import { type Entries, EntriesEq } from '@/common/data/catalog'
import {
  type AdjacentFilter,
  AdjacentFilterEq,
} from '@/common/type/destination'
import * as Listing from '@/component/listing'

// The same listing as the catalog, over `data/adjacent.json`. A base layer
// of the screen stack: the root keeps this model (`Model.adjacent`) under
// every screen, so closing an entry page shows the adjacent list as it was
// left
export type Model = {
  listing: Listing.Model<AdjacentFilter>
}

export const ModelEq: EqClass.Eq<Model> = EqClass.struct({
  listing: Listing.mkModelEq(AdjacentFilterEq),
})

export type Msg = { _tag: 'ListingMsg'; subMsg: Listing.Msg }

export type Props = {
  model: Model
  // The entries of both lists (`Model.entries`)
  entries: Entries
  // How many language logos fit in a row (`logosPerRowOf` the width of the
  // window): a resize draws the list again only when this number changes
  logosPerRow: number
  // The first day that counts as recent (`recentSinceOf`)
  recentSince: string
  dispatch: Dispatcher<Msg>
}

export const PropsEq: EqClass.Eq<Props> = EqClass.struct({
  model: ModelEq,
  entries: EntriesEq,
  logosPerRow: N.Eq,
  recentSince: S.Eq,
  dispatch: EqAlways,
})
