import { test } from '@fast-check/vitest'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { isDeepStrictEqual } from 'node:util'
import { describe, expect, it } from 'vitest'

import {
  adjacentEntries,
  entriesOf,
  frameworks,
  targetOptionsOf,
} from '@/common/data/catalog'
import {
  type AdjacentFilter,
  type CatalogFilter,
  type Choice,
  type EntryCategory,
  type ListingFilter,
  type ListingSort,
  adjacentScreen,
  anyChoice,
  anyStatusChoice,
  catalogScreen,
  catalogTiers,
  choiceOf,
  defaultAdjacentFilter,
  defaultCatalogFilter,
  destinationOfScreen,
  lackables,
  statusChoiceOf,
} from '@/common/type/destination'
import { type Target, targets } from '@/common/type/framework'
import {
  archivedHintCountOf,
  balancedRows,
  cardSortOf,
  cardSorts,
  carriedFilterOf,
  entryNounOf,
  filterFrameworks,
  hiddenArchivedCountOf,
  init,
  isFiltered,
  languageCountsOf,
  logosPerRowOf,
  otherListLinkOf,
  otherListMatchTextOf,
  otherListMatchesOf,
  otherListOf,
  panelFilterCountOf,
  shownArchivedCountOf,
  sortFrameworks,
  sortLabelOf,
  sortOfCardSort,
  update,
} from '@/component/listing'

import { listingFilterArb } from '../../helper/arbitrary'

describe('filterFrameworks', () => {
  it('shows everything but the archived entries with no filter', () => {
    expect(filterFrameworks(defaultCatalogFilter())(frameworks)).toEqual(
      frameworks.filter((f) => f.status !== 'archived'),
    )
    expect(isFiltered(defaultCatalogFilter())).toBe(false)
  })

  it('shows every status when no status is chosen', () => {
    const filter = { ...defaultCatalogFilter(), statuses: statusChoiceOf([]) }
    expect(filterFrameworks(filter)(frameworks)).toEqual(frameworks)
    expect(isFiltered(filter)).toBe(true)
  })

  it('hides the archived entries by default', () => {
    expect(
      filterFrameworks(defaultCatalogFilter())(frameworks).every(
        (f) => f.status !== 'archived',
      ),
    ).toBe(true)
  })

  it('keeps the entries that match any choice of a filter', () => {
    const shown = filterFrameworks({
      ...defaultCatalogFilter(),
      targets: choiceOf(targets, ['mobile', 'tui']),
      statuses: statusChoiceOf([]),
    })(frameworks)
    expect(shown.some((f) => f.targets.includes('mobile'))).toBe(true)
    expect(shown.some((f) => f.targets.includes('tui'))).toBe(true)
    expect(
      shown.every(
        (f) => f.targets.includes('mobile') || f.targets.includes('tui'),
      ),
    ).toBe(true)
  })

  it('filters by target and query together', () => {
    const shown = filterFrameworks({
      ...defaultCatalogFilter(),
      targets: choiceOf(targets, ['tui']),
      query: 'RUST',
    })(frameworks)
    expect(shown.length).toBeGreaterThan(0)
    expect(
      shown.every((f) => f.targets.includes('tui') && f.language === 'Rust'),
    ).toBe(true)
  })

  it('shows only languages or only frameworks, and all with neither', () => {
    const shownWith = (show: O.Option<EntryCategory>) =>
      filterFrameworks({
        ...defaultCatalogFilter(),
        show,
        statuses: statusChoiceOf([]),
      })(frameworks).map((f) => f.id)
    expect(shownWith(O.some('languages'))).toEqual(['elm', 'gren', 'sky'])
    expect(shownWith(O.some('frameworks'))).not.toContain('elm')
    expect(shownWith(O.some('frameworks'))).toHaveLength(
      frameworks.length - shownWith(O.some('languages')).length,
    )
    expect(shownWith(O.none)).toHaveLength(frameworks.length)
  })

  it('filters by tier', () => {
    const shown = filterFrameworks({
      ...defaultCatalogFilter(),
      tiers: choiceOf(catalogTiers, ['superset']),
    })(frameworks)
    expect(shown.map((f) => f.id)).toContain('miso')
    expect(shown.every((f) => f.tier === 'superset')).toBe(true)
  })
})

// The same filter with every choice that ticks every box ticking none: the
// two narrow nothing, so every line of the list must read them alike
const noneForEvery = (filter: ListingFilter): ListingFilter => {
  const none = <A>(choice: Choice<A>): Choice<A> =>
    choice._tag === 'Any' ? anyChoice<A>(false) : choice
  return filter.list === 'catalog'
    ? { ...filter, tiers: none(filter.tiers), targets: none(filter.targets) }
    : { ...filter, lacks: none(filter.lacks), targets: none(filter.targets) }
}

const defaultOf = (filter: ListingFilter): ListingFilter =>
  filter.list === 'catalog' ? defaultCatalogFilter() : defaultAdjacentFilter()

describe('the lines of a list', () => {
  test.prop([listingFilterArb])(
    'read every box ticked as no box ticked',
    (filter) => {
      const entries = entriesOf(filter.list)
      const none = noneForEvery(filter)
      expect(filterFrameworks(filter)(entries)).toEqual(
        filterFrameworks(none)(entries),
      )
      expect(archivedHintCountOf(entries, filter)).toBe(
        archivedHintCountOf(entries, none),
      )
      expect(shownArchivedCountOf(entries, filter)).toBe(
        shownArchivedCountOf(entries, none),
      )
      expect(otherListMatchesOf(filter)).toEqual(otherListMatchesOf(none))
    },
  )

  test.prop([listingFilterArb])(
    'never offer to show and to hide the archive at once',
    (filter) => {
      const entries = entriesOf(filter.list)
      expect(
        archivedHintCountOf(entries, filter) > 0 &&
          shownArchivedCountOf(entries, filter) > 0,
      ).toBe(false)
    },
  )

  test.prop([listingFilterArb])(
    'point to matches the other list really shows, under the filter it opens with',
    (filter) => {
      pipe(
        otherListMatchesOf(filter),
        O.map((matches) => {
          expect(matches.filter.list).toBe(otherListOf(filter.list))
          expect(matches.count).toBeGreaterThan(0)
          expect(matches.count).toBe(
            filterFrameworks(matches.filter)(entriesOf(matches.filter.list))
              .length,
          )
        }),
      )
    },
  )

  test.prop([listingFilterArb])(
    'count as filtered unless the filter is the default of its list',
    (filter) => {
      const shown = { ...filter, layout: 'cards', sort: O.none }
      expect(isFiltered(filter)).toBe(
        !isDeepStrictEqual(shown, defaultOf(filter)),
      )
      // The number on the button: one for each filter of the popover off
      // its default. The popover holds the targets, the statuses and the
      // tier or what an entry lacks; the search, the language and the
      // category are not in it.
      const fallback = defaultOf(filter)
      const own =
        filter.list === 'catalog' && fallback.list === 'catalog'
          ? !isDeepStrictEqual(filter.tiers, fallback.tiers)
          : filter.list === 'adjacent' &&
            fallback.list === 'adjacent' &&
            !isDeepStrictEqual(filter.lacks, fallback.lacks)
      expect(panelFilterCountOf(filter)).toBe(
        [
          own,
          !isDeepStrictEqual(filter.targets, fallback.targets),
          !isDeepStrictEqual(filter.statuses, fallback.statuses),
        ].filter(Boolean).length,
      )
    },
  )
})

describe('lacks', () => {
  it('keeps only the adjacent entries that miss a part', () => {
    const shown = filterFrameworks({
      ...defaultAdjacentFilter(),
      lacks: choiceOf(lackables, ['sub']),
      statuses: statusChoiceOf([]),
    })(adjacentEntries)
    // Missing (redux-loop) and another shape (yew) both lack it; a
    // managed Sub (workflow) does not
    expect(shown.map((e) => e.id)).toContain('redux-loop')
    expect(shown.map((e) => e.id)).toContain('yew')
    expect(shown.map((e) => e.id)).not.toContain('workflow')
  })
})

describe('language', () => {
  it('keeps the entries of a language, both languages of a pair too', () => {
    const shownIn = (language: string) =>
      filterFrameworks({
        ...defaultAdjacentFilter(),
        language: O.some(language),
        statuses: statusChoiceOf([]),
      })(adjacentEntries).map((e) => e.language)
    expect(shownIn('Swift')).toContain('Kotlin and Swift')
    expect(shownIn('Kotlin')).toContain('Kotlin and Swift')
    expect(shownIn('Rust').every((language) => language === 'Rust')).toBe(true)
  })

  it('counts the languages of a list, Elm and TypeScript first, then the most popular', () => {
    const counts = languageCountsOf(frameworks)
    expect(counts.slice(0, 4).map((c) => c.language)).toEqual([
      'Elm',
      'TypeScript',
      'JavaScript',
      'Python',
    ])
    expect(counts[0]).toEqual({ language: 'Elm', count: 2 })
    expect(
      counts.findIndex((c) => c.language === 'Rust') <
        counts.findIndex((c) => c.language === 'Haskell'),
    ).toBe(true)
    expect(counts.map((c) => c.language)).not.toContain('Kotlin and Swift')
    expect(
      languageCountsOf(adjacentEntries).map((c) => c.language),
    ).not.toContain('Kotlin and Swift')
  })
})

describe('search', () => {
  const searched = (query: string) =>
    filterFrameworks({
      ...defaultCatalogFilter(),
      query,
      statuses: statusChoiceOf([]),
    })(frameworks).map((f) => f.id)

  it('finds entries by the labels they show: status, tier, target, language line', () => {
    expect(searched('archived')).toContain('seed')
    expect(searched('superset')).toContain('miso')
    expect(searched('terminal')).toContain('bubbletea')
    expect(searched('rust framework')).toContain('iced')
  })

  it('still needs the Archived status for an archived entry', () => {
    const shown = filterFrameworks({
      ...defaultCatalogFilter(),
      query: 'archived',
    })(frameworks)
    expect(shown.every((f) => f.status !== 'archived')).toBe(true)
  })
})

describe('sort', () => {
  const all = filterFrameworks({
    ...defaultCatalogFilter(),
    statuses: statusChoiceOf([]),
  })(frameworks)

  it('keeps the order of the list with no column', () => {
    expect(sortFrameworks(O.none)(all)).toEqual(all)
  })

  it('sorts by stars both ways, entries without stars last', () => {
    const most = sortFrameworks(
      O.some({ column: 'stars', direction: 'descending' }),
    )(all)
    const least = sortFrameworks(
      O.some({ column: 'stars', direction: 'ascending' }),
    )(all)
    expect(most[0]?.id).toBe('bubbletea')
    expect(most.at(-1)?.stars).toBeUndefined()
    expect(least[0]?.stars).toBeDefined()
    expect(least.at(-1)?.stars).toBeUndefined()
  })

  it('sorts by the day an entry was added, the newest first', () => {
    const newest = sortFrameworks(
      O.some({ column: 'added', direction: 'descending' }),
    )(all)
    const days = newest.map((f) => f.discoveredAt)
    expect(days[0]).toBe([...days].sort().at(-1))
    expect(days).toEqual([...days].sort().reverse())
  })
})

describe('balancedRows', () => {
  const items = (n: number) => Array.from({ length: n }, (_, i) => i)
  const lengths = (n: number, max: number) =>
    balancedRows(items(n), max).map((row) => row.length)

  it('splits into even rows, the longer first', () => {
    expect(lengths(26, 13)).toEqual([13, 13])
    expect(lengths(27, 13)).toEqual([9, 9, 9])
    expect(lengths(26, 7)).toEqual([7, 7, 6, 6])
    expect(lengths(5, 13)).toEqual([5])
  })

  it('keeps every item once, in order', () => {
    expect(balancedRows(items(26), 7).flat()).toEqual(items(26))
  })

  it('makes no row for no items', () => {
    expect(balancedRows([], 7)).toEqual([])
  })
})

describe('logosPerRowOf', () => {
  it('fits as many fixed boxes as the width holds, at most 13', () => {
    expect(logosPerRowOf(320)).toBe(6)
    expect(logosPerRowOf(375)).toBe(7)
    expect(logosPerRowOf(430)).toBe(8)
    expect(logosPerRowOf(540)).toBe(11)
    expect(logosPerRowOf(768)).toBe(13)
    expect(logosPerRowOf(1280)).toBe(13)
    expect(logosPerRowOf(0)).toBe(1)
  })
})

describe('otherListMatchesOf', () => {
  const searchOf = (query: string): CatalogFilter => ({
    ...defaultCatalogFilter(),
    query,
  })
  const adjacentSearchOf = (query: string): AdjacentFilter => ({
    ...defaultAdjacentFilter(),
    query,
  })
  const countOf = (filter: ListingFilter) =>
    pipe(
      otherListMatchesOf(filter),
      O.map((matches) => matches.count),
    )

  it('points each list to the other one', () => {
    expect(otherListOf('catalog')).toBe('adjacent')
    expect(otherListOf('adjacent')).toBe('catalog')
  })

  it('counts the matches of a search in the other list, as it shows them', () => {
    expect(countOf(searchOf('XState'))).toEqual(
      O.some(
        filterFrameworks(adjacentSearchOf('XState'))(adjacentEntries).length,
      ),
    )
    expect(countOf(adjacentSearchOf('Bubble Tea'))).toEqual(
      O.some(filterFrameworks(searchOf('Bubble Tea'))(frameworks).length),
    )
  })

  it('carries what means the same on both lists, and leaves the rest', () => {
    const full: CatalogFilter = {
      list: 'catalog',
      tiers: choiceOf(catalogTiers, ['full']),
      targets: choiceOf(targets, ['web']),
      statuses: statusChoiceOf(['active']),
      query: ' react ',
      show: O.some('frameworks'),
      language: O.some('TypeScript'),
      layout: 'table',
      sort: O.some({ column: 'stars', direction: 'descending' }),
    }
    expect(carriedFilterOf(full)).toEqual(
      O.some({
        ...defaultAdjacentFilter(),
        targets: choiceOf(targetOptionsOf('adjacent'), ['web']),
        statuses: statusChoiceOf(['active']),
        query: 'react',
        language: O.some('TypeScript'),
        layout: 'table',
        sort: O.some({ column: 'stars', direction: 'descending' }),
      }),
    )
  })

  it('carries targets as a choice among those the other list offers', () => {
    const carriedTargetsOf = (chosen: Target[]) =>
      pipe(
        carriedFilterOf({
          ...defaultCatalogFilter(),
          targets: choiceOf(targets, chosen),
        }),
        O.map((carried) => carried.targets),
      )
    // No TEA-adjacent library is a game: game alone can match nothing
    // there, and game is dropped beside others
    expect(carriedTargetsOf(['game'])).toEqual(O.none)
    expect(carriedTargetsOf(['web', 'game'])).toEqual(
      O.some(choiceOf(targetOptionsOf('adjacent'), ['web'])),
    )
    // Every target but game is every one TEA-adjacent offers
    expect(
      carriedTargetsOf(targets.filter((target) => target !== 'game')),
    ).toEqual(O.some(anyChoice(true)))
    // Every box ticked here goes over with none ticked
    expect(carriedTargetsOf([...targets])).toEqual(O.some(anyChoice(false)))
  })

  it('points on targets alone, or statuses that leave some out', () => {
    expect(
      O.isSome(
        otherListMatchesOf({
          ...defaultCatalogFilter(),
          targets: choiceOf(targets, ['web']),
        }),
      ),
    ).toBe(true)
    expect(
      O.isSome(
        otherListMatchesOf({
          ...defaultCatalogFilter(),
          statuses: statusChoiceOf(['active']),
        }),
      ),
    ).toBe(true)
  })

  it('does not point on statuses that widen the list', () => {
    expect(
      otherListMatchesOf({
        ...defaultCatalogFilter(),
        statuses: statusChoiceOf(['active', 'quiet', 'archived']),
      }),
    ).toEqual(O.none)
    expect(
      otherListMatchesOf({
        ...defaultCatalogFilter(),
        statuses: statusChoiceOf([]),
      }),
    ).toEqual(O.none)
  })

  it('reads targets carried with one TEA-adjacent offers left out as narrowing', () => {
    // Everything but TUI on the catalog, game included: on TEA-adjacent it
    // hides the TUI libraries
    const noTui = pipe(
      carriedFilterOf({
        ...defaultCatalogFilter(),
        targets: choiceOf(
          targets,
          targets.filter((target) => target !== 'tui'),
        ),
      }),
      O.map((carried) => carried.targets),
      O.getOrElse(() => anyChoice<Target>(false)),
    )
    expect(noTui._tag).toBe('Only')
    expect(
      archivedHintCountOf(adjacentEntries, {
        ...defaultAdjacentFilter(),
        targets: noTui,
      }),
    ).toBe(2)
    expect(
      O.isSome(
        otherListMatchesOf({
          ...defaultAdjacentFilter(),
          targets: noTui,
        }),
      ),
    ).toBe(true)
  })

  it('finds no TEA-adjacent library in Scala', () => {
    expect(
      otherListMatchesOf({
        ...defaultCatalogFilter(),
        language: O.some('Scala'),
      }),
    ).toEqual(O.none)
  })

  it('skips the archived fallback under statuses the reader chose', () => {
    // Seed is archived: under the default statuses the pointer falls back
    // to it, under Active only it does not
    expect(
      otherListMatchesOf({
        ...adjacentSearchOf('seed'),
        statuses: statusChoiceOf(['active']),
      }),
    ).toEqual(O.none)
  })

  it('names what the matches match', () => {
    const subjectOf = (filter: ListingFilter) =>
      pipe(
        otherListMatchesOf(filter),
        O.map((m) => m.subject),
      )
    expect(
      subjectOf({
        ...defaultAdjacentFilter(),
        language: O.some('TypeScript'),
      }),
    ).toEqual(O.some('these filters'))
    expect(
      subjectOf({
        ...adjacentSearchOf('elm'),
        language: O.some('TypeScript'),
      }),
    ).toEqual(O.some('these filters'))
    // The tier stays behind, so the other list does not match "these
    // filters", only the ones that apply there
    expect(
      subjectOf({
        ...defaultCatalogFilter(),
        tiers: choiceOf(catalogTiers, ['reference']),
        language: O.some('TypeScript'),
      }),
    ).toEqual(O.some('the filters that apply there'))
    // What a library lacks, or the category of entry, stays behind too
    expect(
      subjectOf({
        ...defaultAdjacentFilter(),
        lacks: choiceOf(lackables, ['cmd']),
        language: O.some('TypeScript'),
      }),
    ).toEqual(O.some('the filters that apply there'))
    expect(
      subjectOf({
        ...defaultCatalogFilter(),
        show: O.some('frameworks'),
        language: O.some('TypeScript'),
      }),
    ).toEqual(O.some('the filters that apply there'))
  })

  it('quotes a search beside statuses that widen the list or a one-list filter', () => {
    const subjectOf = (filter: ListingFilter) =>
      pipe(
        otherListMatchesOf(filter),
        O.map((m) => m.subject),
      )
    expect(
      subjectOf({
        ...searchOf('react'),
        statuses: statusChoiceOf(['active', 'quiet', 'archived']),
      }),
    ).toEqual(O.some('"react"'))
    expect(
      subjectOf({ ...searchOf('react'), statuses: statusChoiceOf([]) }),
    ).toEqual(O.some('"react"'))
    expect(
      subjectOf({
        ...searchOf('react'),
        tiers: choiceOf(catalogTiers, ['full']),
      }),
    ).toEqual(O.some('"react"'))
    // Statuses that leave some out are a filter of their own
    expect(
      subjectOf({ ...searchOf('react'), statuses: statusChoiceOf(['active']) }),
    ).toEqual(O.some('these filters'))
  })

  it('names a search alone in quotes', () => {
    expect(
      pipe(
        otherListMatchesOf(searchOf('xstate')),
        O.map((m) => m.subject),
      ),
    ).toEqual(O.some('"xstate"'))
  })

  it('falls back to the archived entries, shown with every status', () => {
    const seed = otherListMatchesOf(adjacentSearchOf('seed'))
    expect(
      pipe(
        seed,
        O.map((m) => m.isArchived),
      ),
    ).toEqual(O.some(true))
    expect(
      pipe(
        seed,
        O.map((m) => m.filter.statuses),
      ),
    ).toEqual(O.some(anyChoice(true)))
    expect(
      pipe(
        otherListMatchesOf(searchOf('XState')),
        O.map((m) => m.isArchived),
      ),
    ).toEqual(O.some(false))
  })

  it('finds nothing when no filter carries over, or nothing matches', () => {
    expect(otherListMatchesOf(searchOf('  '))).toEqual(O.none)
    expect(
      otherListMatchesOf({
        ...defaultCatalogFilter(),
        tiers: choiceOf(catalogTiers, ['full']),
      }),
    ).toEqual(O.none)
    expect(otherListMatchesOf(adjacentSearchOf('no such framework'))).toEqual(
      O.none,
    )
  })

  it('says how many match there, with "also" under results', () => {
    // The matches of a filter of TEA-adjacent, pointed to from the catalog
    const shown = {
      isArchived: false,
      filter: adjacentSearchOf('react'),
      subject: '"react"',
    }
    expect(
      otherListMatchTextOf({
        matches: { ...shown, count: 3 },
        isAlso: true,
      }),
    ).toBe('3 TEA-adjacent libraries also match "react".')
    expect(
      otherListMatchTextOf({
        matches: { ...shown, count: 2, subject: 'these filters' },
        isAlso: true,
      }),
    ).toBe('2 TEA-adjacent libraries also match these filters.')
    expect(
      otherListMatchTextOf({
        matches: {
          ...shown,
          filter: searchOf('seed'),
          count: 1,
          isArchived: true,
          subject: '"seed"',
        },
        isAlso: false,
      }),
    ).toBe('1 archived framework in the Main catalog matches "seed".')
  })

  it('links to the matches with the filter that shows them', () => {
    expect(
      pipe(
        otherListMatchesOf(searchOf('xstate')),
        O.map((matches) => otherListLinkOf(matches)),
      ),
    ).toEqual(
      O.some({
        destination: destinationOfScreen(
          adjacentScreen(adjacentSearchOf('xstate')),
        ),
        label: 'Show in TEA-adjacent',
      }),
    )
    // An archived match opens the other list with every status shown
    expect(
      pipe(
        otherListMatchesOf(adjacentSearchOf('seed')),
        O.map((matches) => otherListLinkOf(matches)),
      ),
    ).toEqual(
      O.some({
        destination: destinationOfScreen(
          catalogScreen({
            ...searchOf('seed'),
            statuses: anyStatusChoice(true),
          }),
        ),
        label: 'Show in Main catalog',
      }),
    )
  })
})

describe('sort menu of the cards', () => {
  it('sets each sort newest or largest first, and none for the default', () => {
    expect(sortOfCardSort('default')).toEqual(O.none)
    expect(sortOfCardSort('popularity')).toEqual(
      O.some({ column: 'stars', direction: 'descending' }),
    )
    expect(sortOfCardSort('updated')).toEqual(
      O.some({ column: 'updated', direction: 'descending' }),
    )
    expect(sortOfCardSort('created')).toEqual(
      O.some({ column: 'created', direction: 'descending' }),
    )
    expect(sortOfCardSort('added')).toEqual(
      O.some({ column: 'added', direction: 'descending' }),
    )
  })

  it('reads each of its sorts back as its choice', () => {
    cardSorts.forEach((choice) =>
      expect(cardSortOf(sortOfCardSort(choice))).toEqual(O.some(choice)),
    )
  })

  it('names a sort only the table makes', () => {
    const byName: ListingSort = { column: 'name', direction: 'ascending' }
    expect(cardSortOf(O.some(byName))).toEqual(O.none)
    expect(sortLabelOf(byName)).toBe('Framework, A to Z')
    expect(sortLabelOf({ column: 'stars', direction: 'ascending' })).toBe(
      'Stars, fewest first',
    )
  })

  it('sets the sort whole from the menu, and back to the list order', () => {
    const [sorted] = update(
      { _tag: 'SetSort', sort: sortOfCardSort('popularity') },
      init(defaultCatalogFilter()),
    )
    expect(sorted.filter.sort).toEqual(sortOfCardSort('popularity'))
    const [plain] = update({ _tag: 'SetSort', sort: O.none }, sorted)
    expect(plain.filter.sort).toEqual(O.none)
  })
})

describe('hiddenArchivedCountOf', () => {
  const purescript: ListingFilter = {
    ...defaultCatalogFilter(),
    language: O.some('PureScript'),
  }

  it('counts the archived entries a filter matches while they are hidden', () => {
    // Spork and Pux, archived PureScript frameworks
    expect(hiddenArchivedCountOf(frameworks, purescript)).toBe(2)
  })

  it('counts none while the archive is shown', () => {
    expect(
      hiddenArchivedCountOf(frameworks, {
        ...purescript,
        statuses: statusChoiceOf([]),
      }),
    ).toBe(0)
    expect(
      hiddenArchivedCountOf(frameworks, {
        ...purescript,
        statuses: statusChoiceOf(['active', 'archived']),
      }),
    ).toBe(0)
  })

  it('names the archived ones above the results under each narrowing filter', () => {
    const count = (filter: Partial<CatalogFilter>) =>
      archivedHintCountOf(frameworks, { ...defaultCatalogFilter(), ...filter })
    const adjacentCount = (filter: Partial<AdjacentFilter>) =>
      archivedHintCountOf(adjacentEntries, {
        ...defaultAdjacentFilter(),
        ...filter,
      })
    expect(count({ language: O.some('PureScript') })).toBe(2)
    // Seed is archived; Dartea is an archived mobile framework; every
    // archived framework is full TEA; ts-elmish and Comet lack Sub
    expect(count({ query: 'seed' })).toBe(1)
    expect(count({ targets: choiceOf(targets, ['mobile']) })).toBe(1)
    expect(count({ tiers: choiceOf(catalogTiers, ['full']) })).toBe(6)
    expect(count({ show: O.some('frameworks') })).toBe(6)
    expect(adjacentCount({ lacks: choiceOf(lackables, ['sub']) })).toBe(2)
  })

  it('names none under statuses the reader chose', () => {
    expect(
      archivedHintCountOf(frameworks, {
        ...defaultCatalogFilter(),
        language: O.some('PureScript'),
        statuses: statusChoiceOf(['active']),
      }),
    ).toBe(0)
  })

  it('names none when no filter narrows the list', () => {
    expect(archivedHintCountOf(frameworks, defaultCatalogFilter())).toBe(0)
    expect(
      archivedHintCountOf(frameworks, {
        ...defaultCatalogFilter(),
        query: ' ',
      }),
    ).toBe(0)
    // Every box ticked reads as none: "the lines of a list" above
  })

  it('keeps naming the archived ones once they are shown', () => {
    // "Show the archived" leads from the default statuses to these
    const shownOf = (filter: Partial<CatalogFilter>) =>
      shownArchivedCountOf(frameworks, {
        ...defaultCatalogFilter(),
        statuses: statusChoiceOf(['active', 'quiet', 'archived']),
        ...filter,
      })
    expect(shownOf({ query: 'spo' })).toBe(1)
    expect(shownOf({ language: O.some('PureScript') })).toBe(2)
    // No filter that narrows the list, or statuses chosen in the popover
    expect(shownOf({})).toBe(0)
    expect(
      shownOf({ query: 'spo', statuses: statusChoiceOf(['archived']) }),
    ).toBe(0)
    expect(
      shownArchivedCountOf(frameworks, {
        ...defaultCatalogFilter(),
        query: 'spo',
      }),
    ).toBe(0)
  })

  it('names one entry or several of each list', () => {
    expect(entryNounOf('catalog', 1)).toBe('framework')
    expect(entryNounOf('catalog', 2)).toBe('frameworks')
    expect(entryNounOf('adjacent', 1)).toBe('library')
    expect(entryNounOf('adjacent', 3)).toBe('libraries')
  })
})
