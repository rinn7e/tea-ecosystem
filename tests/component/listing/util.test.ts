import * as O from 'fp-ts/Option'
import { describe, expect, it } from 'vitest'

import { adjacentEntries, frameworks } from '@/common/data/catalog'
import {
  type EntryKind,
  type ListingSort,
  defaultListingFilter,
} from '@/common/type/destination'
import {
  balancedRows,
  filterFrameworks,
  init,
  isFiltered,
  languageCountsOf,
  sortFrameworks,
  update,
} from '@/component/listing'

describe('filterFrameworks', () => {
  it('shows everything but the archived entries with no filter', () => {
    expect(filterFrameworks(defaultListingFilter())(frameworks)).toEqual(
      frameworks.filter((f) => f.status !== 'archived'),
    )
    expect(isFiltered(defaultListingFilter())).toBe(false)
  })

  it('shows the archived entries when they are included', () => {
    const filter = { ...defaultListingFilter(), includeArchived: true }
    expect(filterFrameworks(filter)(frameworks)).toEqual(frameworks)
    expect(isFiltered(filter)).toBe(true)
  })

  it('filters by target and query together', () => {
    const shown = filterFrameworks({
      ...defaultListingFilter(),
      target: O.some('tui'),
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
        includeArchived: true,
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
      tier: O.some('superset'),
    })(frameworks)
    expect(shown.map((f) => f.id)).toContain('miso')
    expect(shown.every((f) => f.tier === 'superset')).toBe(true)
  })
})

describe('lacks', () => {
  it('keeps only the adjacent entries that miss a part', () => {
    const shown = filterFrameworks({
      ...defaultListingFilter(),
      lacks: O.some('sub'),
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
        includeArchived: true,
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
      includeArchived: true,
    })(frameworks).map((f) => f.id)

  it('finds entries by the labels they show: status, tier, target, kind', () => {
    expect(searched('archived')).toContain('seed')
    expect(searched('superset')).toContain('miso')
    expect(searched('terminal')).toContain('bubbletea')
    expect(searched('rust framework')).toContain('iced')
  })

  it('still needs Include archived for an archived entry', () => {
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
    includeArchived: true,
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
    const chosen = update({ _tag: 'SetTier', tier: O.some('full') }, open)[0]
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
