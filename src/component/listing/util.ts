import * as A from 'fp-ts/Array'
import { concatAll } from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import * as Ord from 'fp-ts/Ord'
import { pipe } from 'fp-ts/function'
import * as N from 'fp-ts/number'
import * as S from 'fp-ts/string'

import { type ListId, entriesOf, targetOptionsOf } from '@/common/data/catalog'
import {
  languagePopularity,
  pinnedLanguages,
} from '@/common/data/language-popularity'
import {
  type Choice,
  type Destination,
  type EntryCategory,
  type ListingFilter,
  type ListingSort,
  ListingSortEq,
  type SortColumn,
  type SortDirection,
  anyChoice,
  anyStatusChoice,
  choiceOf,
  defaultAdjacentFilter,
  defaultCatalogFilter,
  destinationOfScreen,
  isAnyTicked,
  listScreenOf,
  narrowsChoice,
  passesChoice,
  passesStatus,
  statusChoiceOf,
} from '@/common/type/destination'
import {
  type Concept,
  type Framework,
  type Grade,
  type Status,
  type Target,
  type Tier,
  concepts,
  isLanguageEntry,
  languagesOf,
} from '@/common/type/framework'
import { breakpoints } from '@/common/util/window-width'
import {
  languageLineOf,
  statusLabel,
  targetLabel,
  tierLabel,
} from '@/component/framework-view'

// The words the search reads for an entry: its name, language, summary and
// id, and the labels it shows on screen (status, tier, targets, the language
// line), so whatever a card says can be searched
const searchTextsOf = (framework: Framework): string[] => [
  framework.name,
  framework.language,
  framework.summary,
  framework.id,
  statusLabel(framework.status),
  tierLabel(framework.tier),
  languageLineOf(framework),
  ...framework.targets.map(targetLabel),
]

const matchesQuery =
  (query: string) =>
  (framework: Framework): boolean => {
    const needle = query.trim().toLowerCase()
    if (needle === '') {
      return true
    } else {
      return searchTextsOf(framework).some((text) =>
        text.toLowerCase().includes(needle),
      )
    }
  }

// An entry lacks a part when it is missing or only reached in another
// shape: what keeps an adjacent library out of the catalog
export const lacks =
  (concept: Concept) =>
  (framework: Framework): boolean =>
    framework.rubric[concept] === 'missing' ||
    framework.rubric[concept] === 'equivalent'

// Only the languages or only the frameworks when one is chosen; every
// entry when none is
const matchesCategory =
  (show: O.Option<EntryCategory>) =>
  (framework: Framework): boolean =>
    pipe(
      show,
      O.fold(
        () => true,
        (category) =>
          category === 'languages'
            ? isLanguageEntry(framework)
            : !isLanguageEntry(framework),
      ),
    )

type LanguageCount = { language: string; count: number }

// Where a pinned language stands (`pinnedLanguages`: Elm, then TypeScript),
// after them every other language
const pinRankOf = (language: string): number => {
  const index = pinnedLanguages.indexOf(language)
  return index === -1 ? pinnedLanguages.length : index
}

const languageCountOrd: Ord.Ord<LanguageCount> = concatAll(
  Ord.getMonoid<LanguageCount>(),
)([
  pipe(
    N.Ord,
    Ord.contramap((entry: LanguageCount) => pinRankOf(entry.language)),
  ),
  pipe(
    Ord.reverse(N.Ord),
    Ord.contramap(
      (entry: LanguageCount) => languagePopularity[entry.language] ?? 0,
    ),
  ),
  pipe(
    Ord.reverse(N.Ord),
    Ord.contramap((entry: { count: number }) => entry.count),
  ),
  pipe(
    S.Ord,
    Ord.contramap((entry: { language: string }) => entry.language),
  ),
])

// Whether an entry passes the filters of its own list: the tier and the
// category of entry on the catalog, what it lacks on the adjacent list
const passesOwnFilter = (
  filter: ListingFilter,
  framework: Framework,
): boolean =>
  filter.list === 'catalog'
    ? passesChoice(filter.tiers, (tier) => tier === framework.tier) &&
      matchesCategory(filter.show)(framework)
    : passesChoice(filter.lacks, (concept) => lacks(concept)(framework))

// Whether a filter of its own list narrows it (some tiers, or the category
// of entry, on the catalog; some concepts an entry lacks on the adjacent
// list). It stays behind when the filter is carried to the other list.
const narrowsOwnFilter = (filter: ListingFilter): boolean =>
  filter.list === 'catalog'
    ? narrowsChoice(filter.tiers) || O.isSome(filter.show)
    : narrowsChoice(filter.lacks)

// The entries the filter shows, in the order of their list
export const filterFrameworks =
  (filter: ListingFilter) =>
  (frameworks: Framework[]): Framework[] =>
    pipe(
      frameworks,
      A.filter(
        (framework) =>
          passesOwnFilter(filter, framework) &&
          passesChoice(filter.targets, (target) =>
            framework.targets.includes(target),
          ) &&
          passesStatus(filter.statuses, framework.status) &&
          pipe(
            filter.language,
            O.fold(
              () => true,
              (language) => languagesOf(framework).includes(language),
            ),
          ) &&
          matchesQuery(filter.query)(framework),
      ),
    )

// The other list: the TEA-adjacent page for the catalog, and back
export const otherListOf = (list: ListId): ListId =>
  list === 'catalog' ? 'adjacent' : 'catalog'

// How many archived entries of a list match its filter while the archive
// is hidden (the statuses leave archived out): what "Show the archived"
// would add. None while the archived entries are shown already.
export const hiddenArchivedCountOf = (
  entries: Framework[],
  filter: ListingFilter,
): number =>
  passesStatus(filter.statuses, 'archived')
    ? 0
    : filterFrameworks({ ...filter, statuses: statusChoiceOf(['archived']) })(
        entries,
      ).length

// An entry of a list in words, one or several: "1 framework" on the
// catalog, "2 libraries" on the TEA-adjacent page
export const entryNounOf = (list: ListId, count: number): string =>
  list === 'catalog'
    ? count === 1
      ? 'framework'
      : 'frameworks'
    : count === 1
      ? 'library'
      : 'libraries'

// A choice of targets as the other list reads it, among its `options`:
// the ones it offers kept, none when it offers none of them. A choice that
// narrows nothing goes over with no box ticked: every box of this list
// ticked is not every box of the other one.
const carriedTargetsOf = (
  options: Target[],
  choice: Choice<Target>,
): O.Option<Choice<Target>> =>
  choice._tag === 'Any'
    ? O.some(anyChoice<Target>(false))
    : pipe(
        options.filter((option) => choice.chosen.includes(option)),
        O.fromPredicate((kept) => kept.length > 0),
        O.map((kept) => choiceOf(options, kept)),
      )

// A filter as the other list reads it: the parts that mean the same on
// both lists (the search, the language, the targets and the statuses, with
// the layout and the sort) over the default filter of the other list. The
// filters of its own list (`narrowsOwnFilter`) stay behind. The targets
// become a choice among the ones the other list offers
// (`targetOptionsOf`); none when it offers none of those chosen, so nothing
// there can match.
export const carriedFilterOf = (
  filter: ListingFilter,
): O.Option<ListingFilter> =>
  pipe(
    carriedTargetsOf(targetOptionsOf(otherListOf(filter.list)), filter.targets),
    O.map((carried) => ({
      ...(filter.list === 'catalog'
        ? defaultAdjacentFilter()
        : defaultCatalogFilter()),
      query: filter.query.trim(),
      language: filter.language,
      targets: carried,
      statuses: filter.statuses,
      layout: filter.layout,
      sort: filter.sort,
    })),
  )

// Whether a filter narrows the list enough that its archived entries are
// news: a search with more than spaces, a language, some targets (not
// every one, `narrowsChoice`), or a filter of its own list
// (`narrowsOwnFilter`)
const narrowsForArchive = (filter: ListingFilter): boolean =>
  filter.query.trim() !== '' ||
  O.isSome(filter.language) ||
  narrowsChoice(filter.targets) ||
  narrowsOwnFilter(filter)

// How many archived entries the line above the results of a list names:
// the hidden archived ones (`hiddenArchivedCountOf`), only under the
// default statuses (the reader did not choose which to show) and a filter
// that narrows the list (`narrowsForArchive`). None with no such filter:
// the archive is not news then.
export const archivedHintCountOf = (
  entries: Framework[],
  filter: ListingFilter,
): number =>
  filter.statuses._tag === 'Default' && narrowsForArchive(filter)
    ? hiddenArchivedCountOf(entries, filter)
    : 0

// How many archived entries the same line names once "Show the archived"
// added them: under every status box ticked (where that button leads from
// the default, and where the pointer to the archived matches of the other
// list opens) and a filter that narrows the list, the archived entries
// that match it, so the line stays and offers to hide them again. None
// under any other statuses, which the reader chose in the popover.
export const shownArchivedCountOf = (
  entries: Framework[],
  filter: ListingFilter,
): number =>
  filter.statuses._tag === 'Any' &&
  filter.statuses.allSelected &&
  narrowsForArchive(filter)
    ? filterFrameworks({ ...filter, statuses: statusChoiceOf(['archived']) })(
        entries,
      ).length
    : 0

// Whether a carried filter narrows the other list at all: statuses narrow
// only when they leave out some of what a list shows by default (`Only`);
// the default ones, or every one, do not
const narrowsOtherList = (carried: ListingFilter): boolean =>
  carried.query !== '' ||
  O.isSome(carried.language) ||
  narrowsChoice(carried.targets) ||
  carried.statuses._tag === 'Only'

// What the pointer to the other list says and opens (`otherListMatchesOf`)
export type OtherListMatches = {
  count: number
  isArchived: boolean
  filter: ListingFilter
  subject: string
}

// The matches in the other list of the filter a list is under, the filter
// that shows them there, and how the pointer names what they match: the
// search in quotes when it is the only filter carried, "these filters"
// when every filter on is carried, else "the filters that apply there". The
// entries the other list shows by default come first; when none of them
// match and the statuses are the default ones, its archived entries
// (`isArchived`), shown with every status box ticked, so the archived line
// there offers to hide them. None when no carried filter narrows the other
// list (`narrowsOtherList`), or the other list does not match it at all.
export const otherListMatchesOf = (
  filter: ListingFilter,
): O.Option<OtherListMatches> => {
  const entries = entriesOf(otherListOf(filter.list))
  return pipe(
    carriedFilterOf(filter),
    O.filter(narrowsOtherList),
    O.chain((carried) => {
      const subject =
        carried.query !== '' &&
        O.isNone(carried.language) &&
        !narrowsChoice(carried.targets) &&
        carried.statuses._tag !== 'Only'
          ? `"${carried.query}"`
          : narrowsOwnFilter(filter)
            ? 'the filters that apply there'
            : 'these filters'
      const tries = [
        { filter: carried, isArchived: false },
        ...(carried.statuses._tag === 'Default'
          ? [
              {
                filter: { ...carried, statuses: anyStatusChoice(true) },
                isArchived: true,
              },
            ]
          : []),
      ]
      return pipe(
        tries,
        A.findFirstMap(({ filter: shown, isArchived }) =>
          pipe(
            filterFrameworks(shown)(entries).length,
            O.fromPredicate((count) => count > 0),
            O.map((count): OtherListMatches => ({
              count,
              isArchived,
              filter: shown,
              subject,
            })),
          ),
        ),
      )
    }),
  )
}

// What a list says about the matches in the other list, under its
// results (`isAlso`) or in place of them when it has none: "3 TEA-adjacent
// libraries also match "react"", "1 archived framework in the Main catalog
// matches "seed"", "2 TEA-adjacent libraries also match these filters".
// The catalog is the "Main catalog" there, to set it apart from the
// TEA-adjacent page. The list of the matches is the one of their filter.
export const otherListMatchTextOf = ({
  matches,
  isAlso,
}: {
  matches: OtherListMatches
  isAlso: boolean
}): string => {
  const { count, isArchived, subject } = matches
  const archived = isArchived ? 'archived ' : ''
  const also = isAlso ? 'also ' : ''
  const verb = count === 1 ? 'matches' : 'match'
  return matches.filter.list === 'adjacent'
    ? `${count} ${archived}TEA-adjacent ${count === 1 ? 'library' : 'libraries'} ${also}${verb} ${subject}.`
    : `${count} ${archived}${count === 1 ? 'framework' : 'frameworks'} in the Main catalog ${also}${verb} ${subject}.`
}

// The link to the matches on the other list, with the filter that shows
// them, and its words
export const otherListLinkOf = (
  matches: OtherListMatches,
): { destination: Destination; label: string } => ({
  destination: destinationOfScreen(listScreenOf(matches.filter)),
  label:
    matches.filter.list === 'adjacent'
      ? 'Show in TEA-adjacent'
      : 'Show in Main catalog',
})

// Whether anything is ticked or typed: Clear filters shows, also for a
// choice with every box ticked, which stays ticked on screen
export const isFiltered = (filter: ListingFilter): boolean =>
  (filter.list === 'catalog'
    ? isAnyTicked(filter.tiers) || O.isSome(filter.show)
    : isAnyTicked(filter.lacks)) ||
  isAnyTicked(filter.targets) ||
  filter.statuses._tag !== 'Default' ||
  filter.query !== '' ||
  O.isSome(filter.language)

// Every language of a list with its number of entries: Elm and TypeScript
// first (`pinnedLanguages`), then the most popular (`languagePopularity`),
// then the one with the most entries, then by name. The row of language
// logos.
export const languageCountsOf = (
  entries: Framework[],
): { language: string; count: number }[] =>
  pipe(
    entries,
    A.flatMap(languagesOf),
    A.reduce(new Map<string, number>(), (counts, language) =>
      new Map(counts).set(language, (counts.get(language) ?? 0) + 1),
    ),
    (counts) => [...counts].map(([language, count]) => ({ language, count })),
    A.sort(languageCountOrd),
  )

// `items` in rows of at most `maxPerRow`, as even as they can be: the rows
// differ by one at most, the longer ones first (26 in rows of 13: 13 and
// 13; in rows of 7: 7, 7, 6 and 6), so a centred block never ends on a
// short last row
export const balancedRows = <A>(items: A[], maxPerRow: number): A[][] => {
  const rowCount = Math.ceil(items.length / Math.max(1, maxPerRow))
  const base = Math.floor(items.length / Math.max(1, rowCount))
  const longer = items.length - base * rowCount
  return A.makeBy(rowCount, (row) => {
    const start = row * base + Math.min(row, longer)
    return items.slice(start, start + base + (row < longer ? 1 : 0))
  })
}

// How many language logos fit in a row in a window `windowWidth` wide: as
// many fixed boxes as the content holds (40px with 6px gaps below `lg`,
// 44px with 8px from it, as the view draws them), at most 13. Where the
// CSS and `windowWidth` disagree on `lg` (`breakpoints`), 13 fit either way.
export const logosPerRowOf = (windowWidth: number): number => {
  const isDesktop = windowWidth >= breakpoints.lg
  const box = isDesktop ? 44 : 40
  const gap = isDesktop ? 8 : 6
  // The content column: at most 1080px, inside 16px gutters
  const content = Math.min(windowWidth, 1080 + 32) - 32
  return Math.min(13, Math.max(1, Math.floor((content + gap) / (box + gap))))
}

const tierRank = (tier: Tier): number =>
  tier === 'reference' ? 0 : tier === 'full' ? 1 : tier === 'superset' ? 2 : 3

const statusRank = (status: Status): number =>
  status === 'active' ? 0 : status === 'quiet' ? 1 : 2

const gradePoints = (grade: Grade): number =>
  grade === 'native'
    ? 3
    : grade === 'managed'
      ? 2
      : grade === 'equivalent'
        ? 1
        : 0

// How close an entry is to Elm, part by part: Native counts most, then
// Managed, then Equivalent
export const rubricScoreOf = (framework: Framework): number =>
  concepts.reduce(
    (sum, concept) => sum + gradePoints(framework.rubric[concept]),
    0,
  )

// The value an entry sorts by in a column; none for a value it lacks (no
// stars or dates without a public repository)
const sortKeyOf =
  (column: SortColumn) =>
  (framework: Framework): O.Option<number | string> => {
    switch (column) {
      case 'name':
        return O.some(framework.name.toLowerCase())
      case 'tier':
        return O.some(tierRank(framework.tier))
      case 'rubric':
        return O.some(rubricScoreOf(framework))
      case 'status':
        return O.some(statusRank(framework.status))
      case 'stars':
        return O.fromNullable(framework.stars)
      case 'created':
        return O.fromNullable(framework.createdAt)
      case 'updated':
        return O.fromNullable(framework.updatedAt)
      case 'added':
        return O.some(framework.discoveredAt)
    }
  }

const compareKeys = (a: number | string, b: number | string): number =>
  a < b ? -1 : a > b ? 1 : 0

// Two values in a direction; a missing value after any present one
const compareInDirection =
  (direction: SortDirection) =>
  (a: O.Option<number | string>, b: O.Option<number | string>): number =>
    O.isSome(a) && O.isSome(b)
      ? compareKeys(a.value, b.value) * (direction === 'ascending' ? 1 : -1)
      : O.isSome(a)
        ? -1
        : O.isSome(b)
          ? 1
          : 0

// The entries in the order of the chosen column, an entry without a value
// last in both directions. Entries with the same value keep the order of
// their list (the sort is stable), and no column keeps that order whole.
export const sortFrameworks =
  (sort: O.Option<ListingSort>) =>
  (frameworks: Framework[]): Framework[] =>
    pipe(
      sort,
      O.fold(
        () => frameworks,
        ({ column, direction }) =>
          [...frameworks].sort((x, y) =>
            compareInDirection(direction)(
              sortKeyOf(column)(x),
              sortKeyOf(column)(y),
            ),
          ),
      ),
    )

// The orders the sort menu of the cards offers, the table sorting by any
// column: the order of the list (Elm, react-tea-cup, then the most
// starred), the most stars, the last push, the creation of the repository
// and the day it joined the catalog, each newest or largest first
export type CardSort =
  'default' | 'popularity' | 'updated' | 'created' | 'added'

export const cardSorts: readonly CardSort[] = [
  'default',
  'popularity',
  'updated',
  'created',
  'added',
]

export const cardSortLabel = (choice: CardSort): string => {
  switch (choice) {
    case 'default':
      return 'Default'
    case 'popularity':
      return 'Popularity'
    case 'updated':
      return 'Recently updated'
    case 'created':
      return 'Recently created'
    case 'added':
      return 'Newly added'
  }
}

const columnOfCardSort = (choice: CardSort): O.Option<SortColumn> => {
  switch (choice) {
    case 'default':
      return O.none
    case 'popularity':
      return O.some('stars')
    case 'updated':
      return O.some('updated')
    case 'created':
      return O.some('created')
    case 'added':
      return O.some('added')
  }
}

// The sort a choice of the menu sets
export const sortOfCardSort = (choice: CardSort): O.Option<ListingSort> =>
  pipe(
    columnOfCardSort(choice),
    O.map((column): ListingSort => ({ column, direction: 'descending' })),
  )

// The choice of the menu a sort is; none for one only the table makes (by
// name, or oldest first), which the menu shows as it is
export const cardSortOf = (sort: O.Option<ListingSort>): O.Option<CardSort> =>
  pipe(
    [...cardSorts],
    A.findFirst((choice) =>
      O.getEq(ListingSortEq).equals(sortOfCardSort(choice), sort),
    ),
  )

// The words of a column of the table: its name, then how it reads sorted
// up and sorted down
const sortWordsOf = (
  column: SortColumn,
): { name: string; ascending: string; descending: string } => {
  switch (column) {
    case 'name':
      return { name: 'Framework', ascending: 'A to Z', descending: 'Z to A' }
    case 'tier':
      return {
        name: 'Tier',
        ascending: 'Originator first',
        descending: 'Originator last',
      }
    case 'rubric':
      return {
        name: 'Rubric',
        ascending: 'weakest first',
        descending: 'strongest first',
      }
    case 'status':
      return {
        name: 'Status',
        ascending: 'active first',
        descending: 'archived first',
      }
    case 'stars':
      return {
        name: 'Stars',
        ascending: 'fewest first',
        descending: 'most first',
      }
    case 'created':
      return {
        name: 'Created',
        ascending: 'oldest first',
        descending: 'newest first',
      }
    case 'updated':
      return {
        name: 'Updated',
        ascending: 'oldest first',
        descending: 'newest first',
      }
    case 'added':
      return {
        name: 'Added',
        ascending: 'oldest first',
        descending: 'newest first',
      }
  }
}

// The words of a sort of the table, for the sort menu of the cards when
// it is none of its choices ("Framework, A to Z", "Stars, fewest first")
export const sortLabelOf = (sort: ListingSort): string => {
  const words = sortWordsOf(sort.column)
  return `${words.name}, ${sort.direction === 'ascending' ? words.ascending : words.descending}`
}
