import * as EqClass from 'fp-ts/Eq'
import * as O from 'fp-ts/Option'
import { type Option } from 'fp-ts/Option'
import * as S from 'fp-ts/string'

import { type Concept, type Target, type Tier } from '@/common/type/framework'

import {
  type Choice,
  type StatusChoice,
  StatusChoiceEq,
  anyChoice,
  defaultStatusChoice,
  getChoiceEq,
} from './choice'

// How a list (the catalog, TEA-adjacent) shows its entries
export type ListingLayout = 'cards' | 'table'

// The two kinds of entry the catalog can narrow to
export type EntryKind = 'languages' | 'frameworks'

// A column a list can be sorted by, from the headers of its table
export type SortColumn =
  | 'name'
  | 'tier'
  | 'rubric'
  | 'status'
  | 'stars'
  | 'created'
  | 'updated'
  | 'added'

export const sortColumns: readonly SortColumn[] = [
  'name',
  'tier',
  'rubric',
  'status',
  'stars',
  'created',
  'updated',
  'added',
]

export type SortDirection = 'ascending' | 'descending'

export type ListingSort = {
  column: SortColumn
  direction: SortDirection
}

export const ListingSortEq: EqClass.Eq<ListingSort> = EqClass.struct({
  column: S.Eq,
  direction: S.Eq,
})

// The direction a column sorts in on its first click: names A to Z, the
// order of tiers and statuses as the rubric lists them, and every number
// or date the largest or newest first
export const firstDirectionOf = (column: SortColumn): SortDirection =>
  column === 'name' || column === 'tier' || column === 'status'
    ? 'ascending'
    : 'descending'

// The languages the "Build your own TEA" guide is written in
export type BuildLanguage = 'swift' | 'typescript' | 'kotlin'

export const buildLanguages: readonly BuildLanguage[] = [
  'swift',
  'typescript',
  'kotlin',
]

// The filters of a list, which a link can share. The catalog filters by
// `tier`, the adjacent list by the part an entry `lacks`; each leaves the
// other one `Any`.
// Each filter of the popover is a `Choice` among the options the list
// offers: an entry passes when it matches any option chosen, and `Any`
// (no box ticked, or every one) passes every entry
export type ListingFilter = {
  tiers: Choice<Tier>
  // What an entry of the adjacent list lacks
  lacks: Choice<Concept>
  targets: Choice<Target>
  // Active and quiet by default: archived entries are hidden until chosen
  statuses: StatusChoice
  query: string
  // Only the language entries (Elm, Gren), or only the frameworks; none
  // shows every entry
  show: Option<EntryKind>
  // Only the entries written in this language (`languagesOf`)
  language: Option<string>
  layout: ListingLayout
  // A column chosen in the table header; none keeps the order of the list
  // (the Originator first, then react-tea-cup, then the most starred)
  sort: Option<ListingSort>
}

export type CatalogScreen = {
  readonly _tag: 'CatalogScreen'
  filter: ListingFilter
}

export type FrameworkScreen = {
  readonly _tag: 'FrameworkScreen'
  frameworkId: string
}

export type RubricScreen = {
  readonly _tag: 'RubricScreen'
}

export type AboutScreen = {
  readonly _tag: 'AboutScreen'
}

export type AdjacentScreen = {
  readonly _tag: 'AdjacentScreen'
  filter: ListingFilter
}

export type BuildScreen = {
  readonly _tag: 'BuildScreen'
  language: BuildLanguage
}

export type NotFoundScreen = {
  readonly _tag: 'NotFoundScreen'
}

export type Screen =
  | CatalogScreen
  | FrameworkScreen
  | RubricScreen
  | AboutScreen
  | AdjacentScreen
  | BuildScreen
  | NotFoundScreen

export const ListingFilterEq: EqClass.Eq<ListingFilter> = EqClass.struct({
  tiers: getChoiceEq(S.Eq),
  lacks: getChoiceEq(S.Eq),
  targets: getChoiceEq(S.Eq),
  statuses: StatusChoiceEq,
  query: S.Eq,
  show: O.getEq(S.Eq),
  language: O.getEq(S.Eq),
  layout: S.Eq,
  sort: O.getEq(ListingSortEq),
})

export const ScreenEq: EqClass.Eq<Screen> = {
  equals: (x, y) => {
    if (x._tag === 'CatalogScreen' && y._tag === 'CatalogScreen') {
      return ListingFilterEq.equals(x.filter, y.filter)
    } else if (x._tag === 'FrameworkScreen' && y._tag === 'FrameworkScreen') {
      return x.frameworkId === y.frameworkId
    } else if (x._tag === 'RubricScreen' && y._tag === 'RubricScreen') {
      return true
    } else if (x._tag === 'AboutScreen' && y._tag === 'AboutScreen') {
      return true
    } else if (x._tag === 'AdjacentScreen' && y._tag === 'AdjacentScreen') {
      return ListingFilterEq.equals(x.filter, y.filter)
    } else if (x._tag === 'BuildScreen' && y._tag === 'BuildScreen') {
      return x.language === y.language
    } else if (x._tag === 'NotFoundScreen' && y._tag === 'NotFoundScreen') {
      return true
    } else {
      return false
    }
  },
}

// Where the app is. Never stored: read from the models that show it
// (`destinationOf`), and written to the URL from there.
export type Destination = {
  readonly screen: Screen
}

export const DestinationEq: EqClass.Eq<Destination> = EqClass.struct({
  screen: ScreenEq,
})

export const destinationOfScreen = (screen: Screen): Destination => ({
  screen,
})

// The options of the filters of the popover: the tiers of the catalog, and
// the parts an adjacent library can lack (Model is never among them)
export const catalogTiers: readonly Tier[] = ['reference', 'full', 'superset']

export const lackables: readonly Concept[] = [
  'msg',
  'update',
  'view',
  'cmd',
  'sub',
]

export const defaultListingFilter = (): ListingFilter => ({
  tiers: anyChoice(false),
  lacks: anyChoice(false),
  targets: anyChoice(false),
  statuses: defaultStatusChoice(),
  query: '',
  show: O.none,
  language: O.none,
  layout: 'cards',
  sort: O.none,
})

export const catalogScreen = (
  filter: ListingFilter = defaultListingFilter(),
): Screen => ({ _tag: 'CatalogScreen', filter })
export const frameworkScreen = (frameworkId: string): Screen => ({
  _tag: 'FrameworkScreen',
  frameworkId,
})
export const rubricScreen = (): Screen => ({ _tag: 'RubricScreen' })
export const aboutScreen = (): Screen => ({ _tag: 'AboutScreen' })
export const adjacentScreen = (
  filter: ListingFilter = defaultListingFilter(),
): Screen => ({ _tag: 'AdjacentScreen', filter })
export const buildScreen = (
  language: BuildLanguage = 'typescript',
): Screen => ({
  _tag: 'BuildScreen',
  language,
})
export const notFoundScreen = (): Screen => ({ _tag: 'NotFoundScreen' })

export const defaultDestination = (): Destination =>
  destinationOfScreen(catalogScreen())

// Every move of the app goes through `navigationMsgHandler`. `UrlChanged`
// is the browser's back or forward, the only move that comes from the URL
// after the boot. Each carries a scroll read at the edge: `Navigate` the
// scroll of the page at the click (the screen it leaves), `UrlChanged` the
// scroll saved in the history entry it lands on.
export type NavigationMsg =
  | {
      readonly _tag: 'Navigate'
      readonly destination: Destination
      readonly scrollY: number
      // A link back to the list under the page (`Link` with `back`): the
      // list comes back as it was left, at its scroll. Any other link
      // opens its screen at the top.
      readonly back: boolean
    }
  | {
      readonly _tag: 'UrlChanged'
      readonly destination: Destination
      readonly scrollY: number
    }
