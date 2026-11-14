import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { describe, expect, it } from 'vitest'

import { adjacentEntries, frameworks } from '@/common/data/catalog'
import {
  type EntryKind,
  type ListingFilter,
  type ListingSort,
  adjacentScreen,
  catalogScreen,
  defaultListingFilter,
  destinationOfScreen,
  lackables,
  toggleChoice,
} from '@/common/type/destination'
import { targets } from '@/common/type/framework'
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
  shownArchivedCountOf,
  sortFrameworks,
  sortLabelOf,
  sortOfCardSort,
  targetOptionsOf,
  update,
} from '@/component/listing'

describe('filterFrameworks', () => {
  it('shows everything but the archived entries with no filter', () => {
    expect(filterFrameworks(defaultListingFilter())(frameworks)).toEqual(
      frameworks.filter((f) => f.status !== 'archived'),
    )
    expect(isFiltered(defaultListingFilter())).toBe(false)
  })

  it('shows every status when no status is chosen', () => {
    const filter = { ...defaultListingFilter(), statuses: [] }
    expect(filterFrameworks(filter)(frameworks)).toEqual(frameworks)
    expect(isFiltered(filter)).toBe(true)
  })

  it('hides the archived entries by default', () => {
    expect(
      filterFrameworks(defaultListingFilter())(frameworks).every(
        (f) => f.status !== 'archived',
      ),
    ).toBe(true)
  })

  it('keeps the entries that match any choice of a filter', () => {
    const shown = filterFrameworks({
      ...defaultListingFilter(),
      targets: ['mobile', 'tui'],
      statuses: [],
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
      ...defaultListingFilter(),
      targets: ['tui'],
      query: 'RUST',
    })(frameworks)
    expect(shown.length).toBeGreaterThan(0)
    expect(
      shown.every((f) => f.targets.includes('tui') && f.language === 'Rust'),
    ).toBe(true)
  })

  it('shows only languages or only frameworks, and all with neither', () => {
    const shownWith = (show: O.Option<EntryKind>) =>
      filterFrameworks({
        ...defaultListingFilter(),
        show,
        statuses: [],
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
      ...defaultListingFilter(),
      tiers: ['superset'],
    })(frameworks)
    expect(shown.map((f) => f.id)).toContain('miso')
    expect(shown.every((f) => f.tier === 'superset')).toBe(true)
  })
})

describe('lacks', () => {
  it('keeps only the adjacent entries that miss a part', () => {
    const shown = filterFrameworks({
      ...defaultListingFilter(),
      lacks: ['sub'],
      statuses: [],
    })(adjacentEntries)
    // Missing (redux-loop) and another shape (yew) both lack it; a
    // managed Sub (workflow) does not
    expect(shown.map((e) => e.id)).toContain('redux-loop')
    expect(shown.map((e) => e.id)).toContain('yew')
    expect(shown.map((e) => e.id)).not.toContain('workflow')
  })
})

describe('ToggleShow', () => {
  it('chooses a kind, and clears it when chosen again', () => {
    const toggle = (show: O.Option<EntryKind>, entryKind: EntryKind) =>
      update(
        { _tag: 'ToggleShow', entryKind },
        init({ ...defaultListingFilter(), show }),
      )[0].filter.show
    expect(toggle(O.none, 'languages')).toEqual(O.some('languages'))
    expect(toggle(O.some('languages'), 'frameworks')).toEqual(
      O.some('frameworks'),
    )
    expect(toggle(O.some('frameworks'), 'frameworks')).toEqual(O.none)
  })
})

describe('language', () => {
  it('keeps the entries of a language, both languages of a pair too', () => {
    const shownIn = (language: string) =>
      filterFrameworks({
        ...defaultListingFilter(),
        language: O.some(language),
        statuses: [],
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

  it('chooses a language, and clears it when chosen again', () => {
    const chosen = update(
      { _tag: 'ToggleLanguage', language: 'Rust' },
      init(defaultListingFilter()),
    )[0]
    expect(chosen.filter.language).toEqual(O.some('Rust'))
    expect(
      update({ _tag: 'ToggleLanguage', language: 'Rust' }, chosen)[0].filter
        .language,
    ).toEqual(O.none)
  })
})

describe('search', () => {
  const searched = (query: string) =>
    filterFrameworks({
      ...defaultListingFilter(),
      query,
      statuses: [],
    })(frameworks).map((f) => f.id)

  it('finds entries by the labels they show: status, tier, target, kind', () => {
    expect(searched('archived')).toContain('seed')
    expect(searched('superset')).toContain('miso')
    expect(searched('terminal')).toContain('bubbletea')
    expect(searched('rust framework')).toContain('iced')
  })

  it('still needs the Archived status for an archived entry', () => {
    const shown = filterFrameworks({
      ...defaultListingFilter(),
      query: 'archived',
    })(frameworks)
    expect(shown.every((f) => f.status !== 'archived')).toBe(true)
  })
})

describe('sort', () => {
  const all = filterFrameworks({
    ...defaultListingFilter(),
    statuses: [],
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

  it('sorts names from A, and turns around on the same column', () => {
    const byName = update(
      { _tag: 'SortBy', column: 'name' },
      init(defaultListingFilter()),
    )[0]
    expect(byName.filter.sort).toEqual(
      O.some({ column: 'name', direction: 'ascending' }),
    )
    expect(
      update({ _tag: 'SortBy', column: 'name' }, byName)[0].filter.sort,
    ).toEqual(O.some({ column: 'name', direction: 'descending' }))
    expect(
      update({ _tag: 'SortBy', column: 'stars' }, byName)[0].filter.sort,
    ).toEqual(O.some({ column: 'stars', direction: 'descending' }))
  })

  it('keeps the sort when the filters are cleared', () => {
    const sort: ListingSort = { column: 'stars', direction: 'ascending' }
    const sorted = init({
      ...defaultListingFilter(),
      query: 'rust',
      sort: O.some(sort),
    })
    expect(update({ _tag: 'ClearFilter' }, sorted)[0].filter.sort).toEqual(
      sorted.filter.sort,
    )
  })
})

describe('filter popover', () => {
  const open = update({ _tag: 'TogglePanel' }, init(defaultListingFilter()))[0]

  it('opens on the button, and fades out before it closes', () => {
    expect(open.panel).toBe('open')
    const closing = update({ _tag: 'TogglePanel' }, open)[0]
    expect(closing.panel).toBe('closing')
    expect(
      update({ _tag: 'PanelClosed', seq: closing.panelSeq }, closing)[0].panel,
    ).toBe('closed')
  })

  it('closes on Escape and a press outside, not inside or another key', () => {
    expect(update({ _tag: 'PanelKeyDown', key: 'Escape' }, open)[0].panel).toBe(
      'closing',
    )
    expect(update({ _tag: 'PanelKeyDown', key: 'a' }, open)[0].panel).toBe(
      'open',
    )
    expect(
      update({ _tag: 'PanelPointerDown', isInside: false }, open)[0].panel,
    ).toBe('closing')
    expect(
      update({ _tag: 'PanelPointerDown', isInside: true }, open)[0].panel,
    ).toBe('open')
  })

  it('stays open while choosing, and a stale fade does not close it', () => {
    const chosen = update(
      {
        _tag: 'ToggleTier',
        tier: 'full',
        options: ['reference', 'full', 'superset'],
      },
      open,
    )[0]
    expect(chosen.panel).toBe('open')
    const closing = update({ _tag: 'TogglePanel' }, chosen)[0]
    const reopened = update({ _tag: 'TogglePanel' }, closing)[0]
    expect(
      update({ _tag: 'PanelClosed', seq: closing.panelSeq }, reopened)[0].panel,
    ).toBe('open')
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

describe('toggleChoice', () => {
  const options = ['active', 'quiet', 'archived'] as const

  it('adds a choice and removes it again, in the order of the options', () => {
    expect(toggleChoice(options, [], 'quiet')).toEqual(['quiet'])
    expect(toggleChoice(options, ['quiet'], 'active')).toEqual([
      'active',
      'quiet',
    ])
    expect(toggleChoice(options, ['active', 'quiet'], 'quiet')).toEqual([
      'active',
    ])
  })

  it('keeps every option chosen, which shows every entry as no choice does', () => {
    const every = toggleChoice(options, ['active', 'quiet'], 'archived')
    expect(every).toEqual(['active', 'quiet', 'archived'])
    expect(
      filterFrameworks({ ...defaultListingFilter(), statuses: every })(
        frameworks,
      ),
    ).toEqual(frameworks)
  })

  it('shows the archive from the default statuses with one press', () => {
    const shown = update(
      { _tag: 'ToggleStatus', status: 'archived' },
      init(defaultListingFilter()),
    )[0].filter.statuses
    expect(shown).toEqual(['active', 'quiet', 'archived'])
  })
})

describe('otherListMatchesOf', () => {
  const searchOf = (query: string): ListingFilter => ({
    ...defaultListingFilter(),
    query,
  })
  const countOf = (kind: 'catalog' | 'adjacent', filter: ListingFilter) =>
    pipe(
      otherListMatchesOf(kind, filter),
      O.map((matches) => matches.count),
    )

  it('points each list to the other one', () => {
    expect(otherListOf('catalog')).toBe('adjacent')
    expect(otherListOf('adjacent')).toBe('catalog')
  })

  it('counts the matches of a search in the other list, as it shows them', () => {
    expect(countOf('catalog', searchOf('XState'))).toEqual(
      O.some(filterFrameworks(searchOf('XState'))(adjacentEntries).length),
    )
    expect(countOf('adjacent', searchOf('Bubble Tea'))).toEqual(
      O.some(filterFrameworks(searchOf('Bubble Tea'))(frameworks).length),
    )
  })

  it('carries what means the same on both lists, and leaves the rest', () => {
    const full: ListingFilter = {
      tiers: ['full'],
      lacks: ['cmd'],
      targets: ['web'],
      statuses: ['active'],
      query: ' react ',
      show: O.some('frameworks'),
      language: O.some('TypeScript'),
      layout: 'table',
      sort: O.some({ column: 'stars', direction: 'descending' }),
    }
    expect(carriedFilterOf('catalog', full)).toEqual({
      ...defaultListingFilter(),
      targets: ['web'],
      statuses: ['active'],
      query: 'react',
      language: O.some('TypeScript'),
      layout: 'table',
      sort: O.some({ column: 'stars', direction: 'descending' }),
    })
  })

  it('points on targets alone, or statuses that leave some out', () => {
    expect(
      O.isSome(
        otherListMatchesOf('catalog', {
          ...defaultListingFilter(),
          targets: ['web'],
        }),
      ),
    ).toBe(true)
    expect(
      O.isSome(
        otherListMatchesOf('catalog', {
          ...defaultListingFilter(),
          statuses: ['active'],
        }),
      ),
    ).toBe(true)
  })

  it('does not point on statuses that widen the list', () => {
    expect(
      otherListMatchesOf('catalog', {
        ...defaultListingFilter(),
        statuses: ['active', 'quiet', 'archived'],
      }),
    ).toEqual(O.none)
    expect(
      otherListMatchesOf('catalog', {
        ...defaultListingFilter(),
        statuses: [],
      }),
    ).toEqual(O.none)
  })

  it('does not point on every target chosen', () => {
    // Every target chosen shows every entry, as no target does
    expect(
      otherListMatchesOf('catalog', {
        ...defaultListingFilter(),
        targets: [...targets],
      }),
    ).toEqual(O.none)
    expect(
      pipe(
        otherListMatchesOf('catalog', {
          ...searchOf('redux'),
          targets: [...targets],
        }),
        O.map((m) => m.subject),
      ),
    ).toEqual(O.some('"redux"'))
  })

  it('reads every target TEA-adjacent offers as none', () => {
    // No TEA-adjacent library is a game: its popover offers six targets
    const six = targetOptionsOf(adjacentEntries)
    expect(six).not.toContain('game')
    expect(
      otherListMatchesOf('adjacent', {
        ...defaultListingFilter(),
        targets: six,
      }),
    ).toEqual(O.none)
    expect(
      pipe(
        otherListMatchesOf('adjacent', { ...searchOf('elm'), targets: six }),
        O.map((m) => m.subject),
      ),
    ).toEqual(O.some('"elm"'))
    expect(
      archivedHintCountOf(adjacentEntries, {
        ...defaultListingFilter(),
        targets: six,
      }),
    ).toBe(0)
  })

  it('names the search alone under every tier chosen', () => {
    // Every tier chosen narrows nothing, so no filter stays behind
    expect(
      pipe(
        otherListMatchesOf('catalog', {
          ...searchOf('redux'),
          tiers: ['reference', 'full', 'superset'],
        }),
        O.map((m) => m.subject),
      ),
    ).toEqual(O.some('"redux"'))
  })

  it('finds no TEA-adjacent library in Scala', () => {
    expect(
      otherListMatchesOf('catalog', {
        ...defaultListingFilter(),
        language: O.some('Scala'),
      }),
    ).toEqual(O.none)
  })

  it('skips the archived fallback under statuses the reader chose', () => {
    // Seed is archived: under the default statuses the pointer falls back
    // to it, under Active only it does not
    expect(
      otherListMatchesOf('adjacent', {
        ...searchOf('seed'),
        statuses: ['active'],
      }),
    ).toEqual(O.none)
  })

  it('names what the matches match', () => {
    const subjectOf = (kind: 'catalog' | 'adjacent', filter: ListingFilter) =>
      pipe(
        otherListMatchesOf(kind, filter),
        O.map((m) => m.subject),
      )
    expect(
      subjectOf('adjacent', {
        ...defaultListingFilter(),
        language: O.some('TypeScript'),
      }),
    ).toEqual(O.some('these filters'))
    expect(
      subjectOf('adjacent', {
        ...searchOf('elm'),
        language: O.some('TypeScript'),
      }),
    ).toEqual(O.some('these filters'))
    // The tier stays behind, so the other list does not match "these
    // filters", only the ones that apply there
    expect(
      subjectOf('catalog', {
        ...defaultListingFilter(),
        tiers: ['reference'],
        language: O.some('TypeScript'),
      }),
    ).toEqual(O.some('the filters that apply there'))
    // What a library lacks, or the kind of entry, stays behind too
    expect(
      subjectOf('adjacent', {
        ...defaultListingFilter(),
        lacks: ['cmd'],
        language: O.some('TypeScript'),
      }),
    ).toEqual(O.some('the filters that apply there'))
    expect(
      subjectOf('catalog', {
        ...defaultListingFilter(),
        show: O.some('frameworks'),
        language: O.some('TypeScript'),
      }),
    ).toEqual(O.some('the filters that apply there'))
  })

  it('quotes a search beside statuses that widen the list or a one-list filter', () => {
    const subjectOf = (filter: ListingFilter) =>
      pipe(
        otherListMatchesOf('catalog', filter),
        O.map((m) => m.subject),
      )
    expect(
      subjectOf({
        ...searchOf('react'),
        statuses: ['active', 'quiet', 'archived'],
      }),
    ).toEqual(O.some('"react"'))
    expect(subjectOf({ ...searchOf('react'), statuses: [] })).toEqual(
      O.some('"react"'),
    )
    expect(subjectOf({ ...searchOf('react'), tiers: ['full'] })).toEqual(
      O.some('"react"'),
    )
    // Statuses that leave some out are a filter of their own
    expect(subjectOf({ ...searchOf('react'), statuses: ['active'] })).toEqual(
      O.some('these filters'),
    )
  })

  it('names a search alone in quotes', () => {
    expect(
      pipe(
        otherListMatchesOf('catalog', searchOf('xstate')),
        O.map((m) => m.subject),
      ),
    ).toEqual(O.some('"xstate"'))
  })

  it('falls back to the archived entries, shown with every status', () => {
    const seed = otherListMatchesOf('adjacent', searchOf('seed'))
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
    ).toEqual(O.some([]))
    expect(
      pipe(
        otherListMatchesOf('catalog', searchOf('XState')),
        O.map((m) => m.isArchived),
      ),
    ).toEqual(O.some(false))
  })

  it('finds nothing when no filter carries over, or nothing matches', () => {
    expect(otherListMatchesOf('catalog', searchOf('  '))).toEqual(O.none)
    expect(
      otherListMatchesOf('catalog', {
        ...defaultListingFilter(),
        tiers: ['full'],
      }),
    ).toEqual(O.none)
    expect(
      otherListMatchesOf('adjacent', searchOf('no such framework')),
    ).toEqual(O.none)
  })

  it('says how many match there, with "also" under results', () => {
    const shown = {
      isArchived: false,
      filter: searchOf('react'),
      subject: '"react"',
    }
    expect(
      otherListMatchTextOf({
        kind: 'catalog',
        matches: { ...shown, count: 3 },
        isAlso: true,
      }),
    ).toBe('3 TEA-adjacent libraries also match "react".')
    expect(
      otherListMatchTextOf({
        kind: 'catalog',
        matches: { ...shown, count: 2, subject: 'these filters' },
        isAlso: true,
      }),
    ).toBe('2 TEA-adjacent libraries also match these filters.')
    expect(
      otherListMatchTextOf({
        kind: 'adjacent',
        matches: { ...shown, count: 1, isArchived: true, subject: '"seed"' },
        isAlso: false,
      }),
    ).toBe('1 archived framework in the Main catalog matches "seed".')
  })

  it('links to the matches with the filter that shows them', () => {
    expect(
      pipe(
        otherListMatchesOf('catalog', searchOf('xstate')),
        O.map((matches) => otherListLinkOf('catalog', matches)),
      ),
    ).toEqual(
      O.some({
        destination: destinationOfScreen(adjacentScreen(searchOf('xstate'))),
        label: 'Show in TEA-adjacent',
      }),
    )
    // An archived match opens the other list with every status shown
    expect(
      pipe(
        otherListMatchesOf('adjacent', searchOf('seed')),
        O.map((matches) => otherListLinkOf('adjacent', matches)),
      ),
    ).toEqual(
      O.some({
        destination: destinationOfScreen(
          catalogScreen({ ...searchOf('seed'), statuses: [] }),
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
      init(defaultListingFilter()),
    )
    expect(sorted.filter.sort).toEqual(sortOfCardSort('popularity'))
    const [plain] = update({ _tag: 'SetSort', sort: O.none }, sorted)
    expect(plain.filter.sort).toEqual(O.none)
  })
})

describe('hiddenArchivedCountOf', () => {
  const purescript: ListingFilter = {
    ...defaultListingFilter(),
    language: O.some('PureScript'),
  }

  it('counts the archived entries a filter matches while they are hidden', () => {
    // Spork and Pux, archived PureScript frameworks
    expect(hiddenArchivedCountOf(frameworks, purescript)).toBe(2)
  })

  it('counts none while the archive is shown', () => {
    expect(
      hiddenArchivedCountOf(frameworks, { ...purescript, statuses: [] }),
    ).toBe(0)
    expect(
      hiddenArchivedCountOf(frameworks, {
        ...purescript,
        statuses: ['active', 'archived'],
      }),
    ).toBe(0)
  })

  it('names the archived ones above the results under each narrowing filter', () => {
    const count = (
      entries: typeof frameworks,
      filter: Partial<ListingFilter>,
    ) => archivedHintCountOf(entries, { ...defaultListingFilter(), ...filter })
    expect(count(frameworks, { language: O.some('PureScript') })).toBe(2)
    // Seed is archived; Dartea is an archived mobile framework; every
    // archived framework is full TEA; ts-elmish and Comet lack Sub
    expect(count(frameworks, { query: 'seed' })).toBe(1)
    expect(count(frameworks, { targets: ['mobile'] })).toBe(1)
    expect(count(frameworks, { tiers: ['full'] })).toBe(6)
    expect(count(frameworks, { show: O.some('frameworks') })).toBe(6)
    expect(count(adjacentEntries, { lacks: ['sub'] })).toBe(2)
  })

  it('names none under statuses the reader chose', () => {
    expect(
      archivedHintCountOf(frameworks, {
        ...defaultListingFilter(),
        language: O.some('PureScript'),
        statuses: ['active'],
      }),
    ).toBe(0)
  })

  it('names none when no filter narrows the list', () => {
    expect(archivedHintCountOf(frameworks, defaultListingFilter())).toBe(0)
    expect(
      archivedHintCountOf(frameworks, {
        ...defaultListingFilter(),
        query: ' ',
      }),
    ).toBe(0)
    // Every tier chosen shows every entry, as no choice does
    expect(
      archivedHintCountOf(frameworks, {
        ...defaultListingFilter(),
        tiers: ['reference', 'full', 'superset'],
      }),
    ).toBe(0)
    expect(
      archivedHintCountOf(frameworks, {
        ...defaultListingFilter(),
        targets: [...targets],
      }),
    ).toBe(0)
    expect(
      archivedHintCountOf(adjacentEntries, {
        ...defaultListingFilter(),
        lacks: [...lackables],
      }),
    ).toBe(0)
  })

  it('keeps naming the archived ones once they are shown', () => {
    // "Show the archived" leads from the default statuses to these
    const shownOf = (filter: Partial<ListingFilter>) =>
      shownArchivedCountOf(frameworks, {
        ...defaultListingFilter(),
        statuses: ['active', 'quiet', 'archived'],
        ...filter,
      })
    expect(shownOf({ query: 'spo' })).toBe(1)
    expect(shownOf({ language: O.some('PureScript') })).toBe(2)
    // No filter that narrows the list, or statuses chosen in the popover
    expect(shownOf({})).toBe(0)
    expect(shownOf({ query: 'spo', statuses: ['archived'] })).toBe(0)
    expect(
      shownArchivedCountOf(frameworks, {
        ...defaultListingFilter(),
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
