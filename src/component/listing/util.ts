import * as A from 'fp-ts/Array'
import { concatAll } from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import * as Ord from 'fp-ts/Ord'
import { identity, pipe } from 'fp-ts/function'
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

// The labels a card shows are searched too, so whatever a card says can be
// searched
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

// A part only reached in another shape counts as lacking too: what keeps an
// adjacent library out of the catalog
export const lacks =
  (concept: Concept) =>
  (framework: Framework): boolean =>
    framework.rubric[concept] === 'missing' ||
    framework.rubric[concept] === 'equivalent'

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

const passesOwnFilter = (
  filter: ListingFilter,
  framework: Framework,
): boolean =>
  filter.list === 'catalog'
    ? passesChoice(filter.tiers, (tier) => tier === framework.tier) &&
      matchesCategory(filter.show)(framework)
    : passesChoice(filter.lacks, (concept) => lacks(concept)(framework))

// A filter of its own list stays behind when the filter is carried to the
// other list
const narrowsOwnFilter = (filter: ListingFilter): boolean =>
  filter.list === 'catalog'
    ? narrowsChoice(filter.tiers) || O.isSome(filter.show)
    : narrowsChoice(filter.lacks)

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

export const otherListOf = (list: ListId): ListId =>
  list === 'catalog' ? 'adjacent' : 'catalog'

// What "Show the archived" would add
export const hiddenArchivedCountOf = (
  entries: Framework[],
  filter: ListingFilter,
): number =>
  passesStatus(filter.statuses, 'archived')
    ? 0
    : filterFrameworks({ ...filter, statuses: statusChoiceOf(['archived']) })(
        entries,
      ).length

export const entryNounOf = (list: ListId, count: number): string =>
  list === 'catalog'
    ? count === 1
      ? 'framework'
      : 'frameworks'
    : count === 1
      ? 'library'
      : 'libraries'

// A choice that narrows nothing goes over with no box ticked: every box of
// this list ticked is not every box of the other one
const carriedTargetsOf = (
  options: Target[],
  choice: Choice<Target>,
): O.Option<Choice<Target>> =>
  choice._tag === 'Any'
    ? O.some(anyChoice<Target>(false))
    : pipe(
        choiceOf(options, choice.chosen),
        O.fromPredicate((carried) => isAnyTicked(carried)),
      )

// None when the other list offers none of the chosen targets, so nothing
// there can match
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

// A filter that narrows the list enough that its archived entries are news
const narrowsForArchive = (filter: ListingFilter): boolean =>
  filter.query.trim() !== '' ||
  O.isSome(filter.language) ||
  narrowsChoice(filter.targets) ||
  narrowsOwnFilter(filter)

// Only under the default statuses, as the reader did not choose which to
// show, and a filter that narrows the list: with no such filter the archive
// is not news
export const archivedHintCountOf = (
  entries: Framework[],
  filter: ListingFilter,
): number =>
  filter.statuses._tag === 'Default' && narrowsForArchive(filter)
    ? hiddenArchivedCountOf(entries, filter)
    : 0

// Every status box ticked is where "Show the archived" leads from the
// default, and where the pointer to the archived matches of the other list
// opens: the line stays there and offers to hide them again. Any other
// statuses the reader chose in the popover, so the line names none.
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

// Statuses narrow only when they leave out some of what a list shows by
// default (`Only`); the default ones, or every one, do not
const narrowsOtherList = (carried: ListingFilter): boolean =>
  carried.query !== '' ||
  O.isSome(carried.language) ||
  narrowsChoice(carried.targets) ||
  carried.statuses._tag === 'Only'

export type OtherListMatches = {
  count: number
  isArchived: boolean
  filter: ListingFilter
  subject: string
}

// The archived entries of the other list are tried only after its default
// ones, and shown with every status box ticked, so the archived line there
// offers to hide them
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

// The catalog is the "Main catalog" here, to set it apart from the
// TEA-adjacent page
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
    ? `${count} ${archived}TEA-adjacent ${entryNounOf('adjacent', count)} ${also}${verb} ${subject}.`
    : `${count} ${archived}${entryNounOf('catalog', count)} in the Main catalog ${also}${verb} ${subject}.`
}

export const otherListLinkOf = (
  matches: OtherListMatches,
): { destination: Destination; label: string } => ({
  destination: destinationOfScreen(listScreenOf(matches.filter)),
  label:
    matches.filter.list === 'adjacent'
      ? 'Show in TEA-adjacent'
      : 'Show in Main catalog',
})

// A choice with every box ticked counts, as it stays ticked on screen
export const panelFilterCountOf = (filter: ListingFilter): number =>
  pipe(
    [
      filter.list === 'catalog'
        ? isAnyTicked(filter.tiers)
        : isAnyTicked(filter.lacks),
      isAnyTicked(filter.targets),
      filter.statuses._tag !== 'Default',
    ],
    A.filter(identity),
    A.size,
  )

// Clear filters shows also for a choice with every box ticked, which stays
// ticked on screen
export const isFiltered = (filter: ListingFilter): boolean =>
  (filter.list === 'catalog'
    ? isAnyTicked(filter.tiers) || O.isSome(filter.show)
    : isAnyTicked(filter.lacks)) ||
  isAnyTicked(filter.targets) ||
  filter.statuses._tag !== 'Default' ||
  filter.query !== '' ||
  O.isSome(filter.language)

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

// The rows differ by one at most, the longer ones first (26 in rows of 7:
// 7, 7, 6 and 6), so a centred block never ends on a short last row
export const balancedRows = <A>(items: A[], maxPerRow: number): A[][] => {
  const rowCount = Math.ceil(items.length / Math.max(1, maxPerRow))
  const base = Math.floor(items.length / Math.max(1, rowCount))
  const longer = items.length - base * rowCount
  return A.makeBy(rowCount, (row) => {
    const start = row * base + Math.min(row, longer)
    return items.slice(start, start + base + (row < longer ? 1 : 0))
  })
}

// The boxes and gaps are the ones the view draws. Where the CSS and
// `windowWidth` disagree on `lg` (`breakpoints`), 13 fit either way.
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

// How close an entry is to Elm
export const rubricScoreOf = (framework: Framework): number =>
  concepts.reduce(
    (sum, concept) => sum + gradePoints(framework.rubric[concept]),
    0,
  )

// No stars or dates for an entry without a public repository
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

// Entries with the same value keep the order of their list (the sort is
// stable), and no column keeps that order whole
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

// The table sorts by any column; the sort menu of the cards offers only
// these, each newest or largest first
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

export const sortOfCardSort = (choice: CardSort): O.Option<ListingSort> =>
  pipe(
    columnOfCardSort(choice),
    O.map((column): ListingSort => ({ column, direction: 'descending' })),
  )

// None for a sort only the table makes (by name, or oldest first), which
// the menu shows as it is
export const cardSortOf = (sort: O.Option<ListingSort>): O.Option<CardSort> =>
  pipe(
    [...cardSorts],
    A.findFirst((choice) =>
      O.getEq(ListingSortEq).equals(sortOfCardSort(choice), sort),
    ),
  )

// The shortcut beside the sort leads to the newest entries first, and back
// to the order of the list once they are
export type SortShortcut = 'added' | 'default'

export const sortShortcutOf = (sort: O.Option<ListingSort>): SortShortcut =>
  pipe(
    cardSortOf(sort),
    O.exists((choice) => choice === 'added'),
  )
    ? 'default'
    : 'added'

export const sortShortcutLabel = (shortcut: SortShortcut): string =>
  shortcut === 'added' ? 'New' : 'Default'

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

// For the sort menu of the cards when the sort is none of its choices
export const sortLabelOf = (sort: ListingSort): string => {
  const words = sortWordsOf(sort.column)
  return `${words.name}, ${sort.direction === 'ascending' ? words.ascending : words.descending}`
}
