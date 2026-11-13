import {
  Formatter,
  Match,
  Parser,
  Route,
  end,
  format,
  lit,
  parse,
  query,
  str,
  zero,
} from '@rinn7e/fp-ts-routing'
import * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import { pipe } from 'fp-ts/function'
import * as t from 'io-ts'

import { BASE_URL } from '@/common/env'
import { type Concept, type Target, type Tier } from '@/common/type/framework'

import {
  type BuildLanguage,
  type Destination,
  type EntryKind,
  type ListingFilter,
  type ListingLayout,
  type ListingSort,
  type Screen,
  aboutScreen,
  adjacentScreen,
  buildScreen,
  catalogScreen,
  firstDirectionOf,
  frameworkScreen,
  notFoundScreen,
  rubricScreen,
  sortColumns,
} from './type'

export const removeBaseUrl = (href: string): string => {
  const url = new URL(href)
  const base = BASE_URL.replace(/\/$/, '')
  const pathname =
    base !== '' && url.pathname.startsWith(base)
      ? url.pathname.slice(base.length)
      : url.pathname
  // A path equal to the base itself strips down to '', which is the root
  return (pathname === '' ? '/' : pathname) + url.search
}

export const addBaseUrl = (path: string): string => {
  const base = BASE_URL.replace(/\/$/, '')
  const cleanPath = path.replace(/^\//, '')
  return base + '/' + cleanPath
}

// The only code that knows how a destination is spelled in the URL

// Parser
// ------------------------------------------------------------------

// The query of a list: the catalog reads `tier`, the adjacent list `lacks`
type ListingParams = {
  tier?: string
  lacks?: string
  target?: string
  query?: string
  show?: string
  language?: string
  includeArchived?: string
  layout?: string
  sort?: string
  order?: string
}

const listingParams: t.Type<ListingParams> = t.exact(
  t.partial({
    tier: t.string,
    lacks: t.string,
    target: t.string,
    query: t.string,
    show: t.string,
    language: t.string,
    includeArchived: t.string,
    layout: t.string,
    sort: t.string,
    order: t.string,
  }),
)

type BuildParams = {
  language?: string
}

const buildParams: t.Type<BuildParams> = t.exact(
  t.partial({
    language: t.string,
  }),
)

const catalogMatch = query(listingParams).and(end)
const frameworkMatch: Match<{ frameworkId: string }> = lit('framework')
  .and(str('frameworkId'))
  .and(end)
const rubricMatch = lit('rubric').and(end)
const aboutMatch = lit('about').and(end)
const adjacentMatch = lit('adjacent').and(query(listingParams)).and(end)
const buildMatch = lit('build-your-own').and(query(buildParams)).and(end)

const anyStrings = new Match<object>(
  new Parser((r) => O.some([{}, new Route([], r.query)])),
  new Formatter((r) => r),
)

// An unknown value reads as no filter, so an old or mistyped link still opens
const tierOf = (value: string | undefined): O.Option<Tier> =>
  value === 'reference' || value === 'full' || value === 'superset'
    ? O.some(value)
    : O.none

const lacksOf = (value: string | undefined): O.Option<Concept> =>
  value === 'model' ||
  value === 'msg' ||
  value === 'update' ||
  value === 'view' ||
  value === 'cmd' ||
  value === 'sub' ||
  value === 'ports'
    ? O.some(value)
    : O.none

const targetOf = (value: string | undefined): O.Option<Target> =>
  value === 'web' ||
  value === 'ssr' ||
  value === 'server' ||
  value === 'desktop' ||
  value === 'mobile' ||
  value === 'tui' ||
  value === 'game'
    ? O.some(value)
    : O.none

const listLanguageOf = (value: string | undefined): O.Option<string> =>
  value === undefined || value === '' ? O.none : O.some(value)

const showOf = (value: string | undefined): O.Option<EntryKind> =>
  value === 'languages' || value === 'frameworks' ? O.some(value) : O.none

// `?sort=stars&order=ascending`: an unknown column is no sort, an unknown
// order the first direction of the column
const sortOf = (params: ListingParams): O.Option<ListingSort> =>
  pipe(
    O.fromNullable(params.sort),
    O.chain((value) =>
      pipe(
        sortColumns,
        RA.findFirst((column) => column === value),
      ),
    ),
    O.map((column) => ({
      column,
      direction:
        params.order === 'ascending' || params.order === 'descending'
          ? params.order
          : firstDirectionOf(column),
    })),
  )

const layoutOf = (value: string | undefined): ListingLayout =>
  value === 'table' ? 'table' : 'cards'

const languageOf = (value: string | undefined): BuildLanguage =>
  value === 'swift' || value === 'kotlin' ? value : 'typescript'

const catalogFilterOf = (params: ListingParams): ListingFilter => ({
  tier: tierOf(params.tier),
  lacks: O.none,
  target: targetOf(params.target),
  query: params.query ?? '',
  show: showOf(params.show),
  language: listLanguageOf(params.language),
  includeArchived: params.includeArchived === 'true',
  layout: layoutOf(params.layout),
  sort: sortOf(params),
})

const adjacentFilterOf = (params: ListingParams): ListingFilter => ({
  tier: O.none,
  lacks: lacksOf(params.lacks),
  target: targetOf(params.target),
  query: params.query ?? '',
  show: showOf(params.show),
  language: listLanguageOf(params.language),
  includeArchived: params.includeArchived === 'true',
  layout: layoutOf(params.layout),
  sort: sortOf(params),
})

const screenParser: Parser<Screen> = zero<Screen>()
  .alt(
    catalogMatch.parser.map((params) => catalogScreen(catalogFilterOf(params))),
  )
  .alt(
    frameworkMatch.parser.map(({ frameworkId }) =>
      frameworkScreen(frameworkId),
    ),
  )
  .alt(rubricMatch.parser.map(() => rubricScreen()))
  .alt(aboutMatch.parser.map(() => aboutScreen()))
  .alt(
    adjacentMatch.parser.map((params) =>
      adjacentScreen(adjacentFilterOf(params)),
    ),
  )
  .alt(
    buildMatch.parser.map(({ language }) => buildScreen(languageOf(language))),
  )
  .alt(anyStrings.parser.map(() => notFoundScreen()))

// `href`: a full URL (the page's `location.href`)
export const parseDestination = (href: string): Destination => ({
  screen: parse(
    screenParser,
    Route.parse(removeBaseUrl(href)),
    catalogScreen(),
  ),
})

// Formatter
// ------------------------------------------------------------------

// Defaults are left out of the URL, so the plain catalog is just `/`
const listingParamsOf = (filter: ListingFilter): ListingParams => ({
  tier: pipe(filter.tier, O.toUndefined),
  lacks: pipe(filter.lacks, O.toUndefined),
  target: pipe(filter.target, O.toUndefined),
  query: filter.query === '' ? undefined : filter.query,
  show: pipe(filter.show, O.toUndefined),
  language: pipe(filter.language, O.toUndefined),
  includeArchived: filter.includeArchived ? 'true' : undefined,
  layout: filter.layout === 'cards' ? undefined : filter.layout,
  sort: pipe(
    filter.sort,
    O.map((sort) => sort.column),
    O.toUndefined,
  ),
  order: pipe(
    filter.sort,
    O.map((sort) => sort.direction),
    O.toUndefined,
  ),
})

export const toUrlString = (destination: Destination): string => {
  const { screen } = destination
  const getPath = () => {
    switch (screen._tag) {
      case 'CatalogScreen':
        return format(catalogMatch.formatter, listingParamsOf(screen.filter))
      case 'FrameworkScreen':
        return format(frameworkMatch.formatter, {
          frameworkId: screen.frameworkId,
        })
      case 'RubricScreen':
        return format(rubricMatch.formatter, {})
      case 'AboutScreen':
        return format(aboutMatch.formatter, {})
      case 'AdjacentScreen':
        return format(adjacentMatch.formatter, listingParamsOf(screen.filter))
      case 'BuildScreen':
        return format(buildMatch.formatter, {
          language:
            screen.language === 'typescript' ? undefined : screen.language,
        })
      case 'NotFoundScreen':
        return '404'
    }
  }

  return addBaseUrl(getPath())
}
