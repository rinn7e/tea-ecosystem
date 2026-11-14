import { EqAlways } from '@rinn7e/tea-cup-prelude'
import * as EqClass from 'fp-ts/Eq'
import type * as O from 'fp-ts/Option'
import * as N from 'fp-ts/number'
import * as S from 'fp-ts/string'
import { type Dispatcher } from 'tea-cup-fp'

import {
  type EntryCategory,
  type ListingFilter,
  ListingFilterEq,
  type ListingLayout,
  type ListingSort,
  type SortColumn,
} from '@/common/type/destination'
import {
  type Concept,
  type Status,
  type Target,
  type Tier,
} from '@/common/type/framework'

// Each list is a base layer of the screen stack: the root keeps its model
// while an entry page covers it, so closing the page shows the list as it was
// left. Its filter is the destination's (`CatalogScreen`, `AdjacentScreen`).
// `F` is the filter of its list (`CatalogFilter`, `AdjacentFilter`), so a
// list never holds the filter of the other one
export type Model<F extends ListingFilter> = {
  filter: F
  // Not in the URL: a list opens with it closed
  panel: 'closed' | 'open' | 'closing'
  // Counts every open and close, so a fade timer of an older close does
  // nothing
  panelSeq: number
}

export const mkModelEq = <F extends ListingFilter>(
  filterEq: EqClass.Eq<F>,
): EqClass.Eq<Model<F>> =>
  EqClass.struct<Model<F>>({
    filter: filterEq,
    panel: S.Eq,
    panelSeq: N.Eq,
  })

export type Msg =
  // `options` are the ones the popover shows
  | { _tag: 'ToggleTier'; tier: Tier; options: Tier[] }
  | { _tag: 'ToggleLacks'; concept: Concept; options: Concept[] }
  | { _tag: 'ToggleTarget'; target: Target; options: Target[] }
  | { _tag: 'ToggleStatus'; status: Status }
  | { _tag: 'SetQuery'; query: string }
  | { _tag: 'ToggleShow'; category: EntryCategory }
  | { _tag: 'ToggleLanguage'; language: string }
  | { _tag: 'SetLayout'; layout: ListingLayout }
  // Turns the direction around when it is the column sorted by already
  | { _tag: 'SortBy'; column: SortColumn }
  // From the sort menu of the cards: none for the order of the list
  | { _tag: 'SetSort'; sort: O.Option<ListingSort> }
  | { _tag: 'ClearFilter' }
  | { _tag: 'TogglePanel' }
  // Only while the popover is open
  | { _tag: 'PanelKeyDown'; key: string }
  | { _tag: 'PanelPointerDown'; isInside: boolean }
  | { _tag: 'PanelClosed'; seq: number }

export type Props = {
  model: Model<ListingFilter>
  // Not the width of the window, so a resize draws the list again only when
  // this number changes
  logosPerRow: number
  // Which entries show the ribbon "Recently added" (`recentSinceOf`)
  recentSince: string
  dispatch: Dispatcher<Msg>
}

export const PropsEq: EqClass.Eq<Props> = EqClass.struct({
  model: mkModelEq(ListingFilterEq),
  logosPerRow: N.Eq,
  recentSince: S.Eq,
  dispatch: EqAlways,
})
