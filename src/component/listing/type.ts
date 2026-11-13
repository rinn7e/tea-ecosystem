import { EqAlways } from '@rinn7e/tea-cup-prelude'
import * as EqClass from 'fp-ts/Eq'
import * as N from 'fp-ts/number'
import * as S from 'fp-ts/string'
import { type Dispatcher } from 'tea-cup-fp'

import { type ListKind } from '@/common/data/catalog'
import {
  type EntryKind,
  type ListingFilter,
  ListingFilterEq,
  type ListingLayout,
  type SortColumn,
} from '@/common/type/destination'
import {
  type Concept,
  type Status,
  type Target,
  type Tier,
} from '@/common/type/framework'

// A list of entries (the catalog, or the TEA-adjacent libraries) with its
// stats, search, filters and cards or table. Each list is a base layer of
// the screen stack: the root keeps its model while an entry page covers
// it, so closing the page shows the list as it was left. Its filter is the
// destination's (`CatalogScreen`, `AdjacentScreen`).
export type Model = {
  filter: ListingFilter
  // The popover of the Filters button (tiers or what an entry lacks, and
  // targets): `closing` while it fades out, until `PanelClosed`. Not in the
  // URL: a list opens with it closed.
  panel: 'closed' | 'open' | 'closing'
  // Counts every open and close, so a fade timer of an older close does
  // nothing
  panelSeq: number
}

export const ModelEq: EqClass.Eq<Model> = EqClass.struct({
  filter: ListingFilterEq,
  panel: S.Eq,
  panelSeq: N.Eq,
})

export type Msg =
  // Chooses an option of a filter of the popover, or unchooses it when
  // chosen (`toggleChoice`); `options` are the ones the popover shows
  | { _tag: 'ToggleTier'; tier: Tier; options: Tier[] }
  | { _tag: 'ToggleLacks'; concept: Concept; options: Concept[] }
  | { _tag: 'ToggleTarget'; target: Target; options: Target[] }
  | { _tag: 'ToggleStatus'; status: Status }
  | { _tag: 'SetQuery'; query: string }
  // Narrows to a kind, or back to every entry when it is the one shown
  | { _tag: 'ToggleShow'; entryKind: EntryKind }
  // Narrows to a language, or back to every language when it is the one
  // shown
  | { _tag: 'ToggleLanguage'; language: string }
  | { _tag: 'SetLayout'; layout: ListingLayout }
  // Sorts by a column of the table, or turns its direction around when it
  // is the column sorted by already
  | { _tag: 'SortBy'; column: SortColumn }
  | { _tag: 'ClearFilter' }
  | { _tag: 'TogglePanel' }
  // While the popover is open: a key, or a press inside or outside it
  | { _tag: 'PanelKeyDown'; key: string }
  | { _tag: 'PanelPointerDown'; isInside: boolean }
  | { _tag: 'PanelClosed'; seq: number }

export type Props = {
  // Which list it shows: its entries, words and the select on its left
  kind: ListKind
  model: Model
  // The width of the window: how many language logos fit in a row
  windowWidth: number
  dispatch: Dispatcher<Msg>
}

export const PropsEq: EqClass.Eq<Props> = EqClass.struct({
  kind: S.Eq,
  model: ModelEq,
  windowWidth: N.Eq,
  dispatch: EqAlways,
})
