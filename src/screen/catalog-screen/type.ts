import { EqAlways } from '@rinn7e/tea-cup-prelude'
import * as EqClass from 'fp-ts/Eq'
import * as N from 'fp-ts/number'
import * as S from 'fp-ts/string'
import { type Dispatcher } from 'tea-cup-fp'

import { type CatalogFilter } from '@/common/type/destination'
import * as Listing from '@/component/listing'

// The catalog of TEA frameworks: the shared listing over
// `data/frameworks.json`. A base layer of the screen stack: the root keeps
// this model (`Model.catalog`) under every screen, so closing an entry page
// shows the catalog as it was left
export type Model = {
  listing: Listing.Model<CatalogFilter>
}

export const ModelEq: EqClass.Eq<Model> = EqClass.struct({
  listing: Listing.ModelEq,
})

export type Msg = { _tag: 'ListingMsg'; subMsg: Listing.Msg }

export type Props = {
  model: Model
  // How many language logos fit in a row (`logosPerRowOf` the width of the
  // window): a resize draws the list again only when this number changes
  logosPerRow: number
  // The first day that counts as recent (`recentSinceOf`)
  recentSince: string
  dispatch: Dispatcher<Msg>
}

export const PropsEq: EqClass.Eq<Props> = EqClass.struct({
  model: ModelEq,
  logosPerRow: N.Eq,
  recentSince: S.Eq,
  dispatch: EqAlways,
})
