import * as A from 'fp-ts/Array'
import { concatAll } from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import * as Ord from 'fp-ts/Ord'
import { pipe } from 'fp-ts/function'
import * as N from 'fp-ts/number'
import * as S from 'fp-ts/string'

import {
  languagePopularity,
  pinnedLanguages,
} from '@/common/data/language-popularity'
import {
  type ListingFilter,
  type ListingSort,
  type SortColumn,
  type SortDirection,
  defaultStatuses,
} from '@/common/type/destination'
import {
  type Concept,
  type Framework,
  type Grade,
  type Status,
  type Tier,
  concepts,
  isLanguageEntry,
  languagesOf,
} from '@/common/type/framework'
import { breakpoints } from '@/common/util/window-width'
import {
  kindLineOf,
  statusLabel,
  targetLabel,
  tierLabel,
} from '@/component/framework-view'

// The words the search reads for an entry: its name, language, summary and
// id, and the labels it shows on screen (status, tier, targets, the kind
// line), so whatever a card says can be searched
const searchTextsOf = (framework: Framework): string[] => [
  framework.name,
  framework.language,
  framework.summary,
  framework.id,
  statusLabel(framework.status),
  tierLabel(framework.tier),
  kindLineOf(framework),
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
const matchesEntryKind =
  (filter: ListingFilter) =>
  (framework: Framework): boolean =>
    pipe(
      filter.show,
      O.fold(
        () => true,
        (entryKind) =>
          entryKind === 'languages'
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

// The entries the filter shows, in the order of their list
export const filterFrameworks =
  (filter: ListingFilter) =>
  (frameworks: Framework[]): Framework[] =>
    pipe(
      frameworks,
      A.filter(
        (framework) =>
          (filter.tiers.length === 0 ||
            filter.tiers.includes(framework.tier)) &&
          (filter.lacks.length === 0 ||
            filter.lacks.some((concept) => lacks(concept)(framework))) &&
          (filter.targets.length === 0 ||
            filter.targets.some((target) =>
              framework.targets.includes(target),
            )) &&
          (filter.statuses.length === 0 ||
            filter.statuses.includes(framework.status)) &&
          matchesEntryKind(filter)(framework) &&
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

export const isFiltered = (filter: ListingFilter): boolean =>
  filter.tiers.length > 0 ||
  filter.lacks.length > 0 ||
  filter.targets.length > 0 ||
  !A.getEq(S.Eq).equals(filter.statuses, defaultStatuses()) ||
  filter.query !== '' ||
  O.isSome(filter.show) ||
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
