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

export type ListingLayout = 'cards' | 'table'

export type EntryCategory = 'languages' | 'frameworks'

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

// A first click sorts names A to Z, tiers and statuses in the order the
// rubric lists them, and every number or date the largest or newest first
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

type SharedFilter = {
  targets: Choice<Target>
  // Active and quiet by default: archived entries are hidden until chosen
  statuses: StatusChoice
  query: string
  // Only the entries written in this language (`languagesOf`)
  language: Option<string>
  layout: ListingLayout
  // A column chosen in the table header; none keeps the order of the list
  // (the Originator first, then react-tea-cup, then the most starred)
  sort: Option<ListingSort>
}

export type CatalogFilter = SharedFilter & {
  readonly list: 'catalog'
  tiers: Choice<Tier>
  // Only the language entries (Elm, Gren), or only the frameworks; none
  // shows every entry
  show: Option<EntryCategory>
}

export type AdjacentFilter = SharedFilter & {
  readonly list: 'adjacent'
  lacks: Choice<Concept>
}

// A link can share the filters of a list. `list` says which list, as each
// has filters the other has no field for.
export type ListingFilter = CatalogFilter | AdjacentFilter

export type CatalogScreen = {
  readonly _tag: 'CatalogScreen'
  filter: CatalogFilter
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
  filter: AdjacentFilter
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

// The `Eq` of each filter both lists have, spread into the `Eq` of each
// list, so a field added to `SharedFilter` must be added here
const sharedFilterEqs: {
  [K in keyof SharedFilter]: EqClass.Eq<SharedFilter[K]>
} = {
  targets: getChoiceEq(S.Eq),
  statuses: StatusChoiceEq,
  query: S.Eq,
  language: O.getEq(S.Eq),
  layout: S.Eq,
  sort: O.getEq(ListingSortEq),
}

export const CatalogFilterEq: EqClass.Eq<CatalogFilter> =
  EqClass.struct<CatalogFilter>({
    ...sharedFilterEqs,
    list: S.Eq,
    tiers: getChoiceEq(S.Eq),
    show: O.getEq(S.Eq),
  })

export const AdjacentFilterEq: EqClass.Eq<AdjacentFilter> =
  EqClass.struct<AdjacentFilter>({
    ...sharedFilterEqs,
    list: S.Eq,
    lacks: getChoiceEq(S.Eq),
  })

export const ListingFilterEq: EqClass.Eq<ListingFilter> = {
  equals: (x, y) =>
    x.list === 'catalog' && y.list === 'catalog'
      ? CatalogFilterEq.equals(x, y)
      : x.list === 'adjacent' && y.list === 'adjacent'
        ? AdjacentFilterEq.equals(x, y)
        : false,
}

export const ScreenEq: EqClass.Eq<Screen> = {
  equals: (x, y) => {
    if (x._tag === 'CatalogScreen' && y._tag === 'CatalogScreen') {
      return CatalogFilterEq.equals(x.filter, y.filter)
    } else if (x._tag === 'FrameworkScreen' && y._tag === 'FrameworkScreen') {
      return x.frameworkId === y.frameworkId
    } else if (x._tag === 'RubricScreen' && y._tag === 'RubricScreen') {
      return true
    } else if (x._tag === 'AboutScreen' && y._tag === 'AboutScreen') {
      return true
    } else if (x._tag === 'AdjacentScreen' && y._tag === 'AdjacentScreen') {
      return AdjacentFilterEq.equals(x.filter, y.filter)
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

const defaultSharedFilter = (): SharedFilter => ({
  targets: anyChoice(false),
  statuses: defaultStatusChoice(),
  query: '',
  language: O.none,
  layout: 'cards',
  sort: O.none,
})

export const defaultCatalogFilter = (): CatalogFilter => ({
  ...defaultSharedFilter(),
  list: 'catalog',
  tiers: anyChoice(false),
  show: O.none,
})

export const defaultAdjacentFilter = (): AdjacentFilter => ({
  ...defaultSharedFilter(),
  list: 'adjacent',
  lacks: anyChoice(false),
})

export const catalogScreen = (
  filter: CatalogFilter = defaultCatalogFilter(),
): Screen => ({ _tag: 'CatalogScreen', filter })
export const frameworkScreen = (frameworkId: string): Screen => ({
  _tag: 'FrameworkScreen',
  frameworkId,
})
export const rubricScreen = (): Screen => ({ _tag: 'RubricScreen' })
export const aboutScreen = (): Screen => ({ _tag: 'AboutScreen' })
export const adjacentScreen = (
  filter: AdjacentFilter = defaultAdjacentFilter(),
): Screen => ({ _tag: 'AdjacentScreen', filter })

export const listScreenOf = (filter: ListingFilter): Screen =>
  filter.list === 'catalog' ? catalogScreen(filter) : adjacentScreen(filter)
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
