import * as O from 'fp-ts/Option'
import { describe, expect, it } from 'vitest'

import {
  type Screen,
  aboutScreen,
  adjacentScreen,
  anyChoice,
  buildScreen,
  catalogScreen,
  catalogTiers,
  choiceOf,
  defaultListingFilter,
  defaultStatusChoice,
  destinationOfScreen,
  frameworkScreen,
  lackables,
  notFoundScreen,
  parseDestination,
  rubricScreen,
  statusChoiceOf,
  toUrlString,
} from '@/common/type/destination'
import { targets } from '@/common/type/framework'

const parse = (path: string) => parseDestination(`http://localhost${path}`)

const roundTrip = (screen: Screen) =>
  parse(toUrlString(destinationOfScreen(screen))).screen

describe('destination URL', () => {
  it('spells every screen with readable names', () => {
    expect(toUrlString(destinationOfScreen(catalogScreen()))).toBe('/')
    expect(toUrlString(destinationOfScreen(frameworkScreen('miso')))).toBe(
      '/framework/miso',
    )
    expect(toUrlString(destinationOfScreen(rubricScreen()))).toBe('/rubric')
    expect(toUrlString(destinationOfScreen(aboutScreen()))).toBe('/about')
    expect(toUrlString(destinationOfScreen(adjacentScreen()))).toBe('/adjacent')
    expect(toUrlString(destinationOfScreen(buildScreen('kotlin')))).toBe(
      '/build-your-own?language=kotlin',
    )
    expect(toUrlString(destinationOfScreen(buildScreen()))).toBe(
      '/build-your-own',
    )
  })

  it('keeps the catalog filter in the query', () => {
    const screen = catalogScreen({
      tiers: choiceOf(catalogTiers, ['full', 'superset']),
      lacks: choiceOf(lackables, []),
      targets: choiceOf(targets, ['desktop', 'tui']),
      statuses: statusChoiceOf([]),
      query: 'rust tea',
      show: O.some('frameworks'),
      language: O.some('F#'),
      layout: 'table',
      sort: O.some({ column: 'stars', direction: 'ascending' }),
    })
    expect(roundTrip(screen)).toEqual(screen)
  })

  it('keeps the adjacent filter in the query, with lacks for tier', () => {
    const screen = adjacentScreen({
      tiers: choiceOf(catalogTiers, []),
      lacks: choiceOf(lackables, ['cmd', 'sub']),
      targets: choiceOf(targets, ['web']),
      statuses: statusChoiceOf(['archived']),
      query: '',
      show: O.none,
      language: O.none,
      layout: 'table',
      sort: O.none,
    })
    expect(toUrlString(destinationOfScreen(screen))).toBe(
      '/adjacent?lacks=cmd,sub&target=web&status=archived&layout=table',
    )
    expect(roundTrip(screen)).toEqual(screen)
  })

  it('leaves the default statuses out, and writes no choice as all', () => {
    const filterOf = (path: string) => {
      const { screen } = parseDestination(`http://localhost${path}`)
      return screen._tag === 'CatalogScreen' ? screen.filter : undefined
    }
    expect(filterOf('/')?.statuses).toEqual(defaultStatusChoice())
    expect(filterOf('/?status=active,quiet')?.statuses).toEqual(
      defaultStatusChoice(),
    )
    expect(filterOf('/?status=all')?.statuses).toEqual(anyChoice(false))
    expect(filterOf('/?status=quiet,active,archived')?.statuses).toEqual(
      anyChoice(true),
    )
    expect(filterOf('/?status=nonsense')?.statuses).toEqual(
      defaultStatusChoice(),
    )
    // A link made before the status filter
    expect(filterOf('/?includeArchived=true')?.statuses).toEqual(
      anyChoice(false),
    )
    // Every tier chosen stays ticked, and narrows nothing
    expect(filterOf('/?tier=superset,full,reference')?.tiers).toEqual(
      anyChoice(true),
    )
    expect(
      toUrlString(
        destinationOfScreen(
          catalogScreen({ ...defaultListingFilter(), tiers: anyChoice(true) }),
        ),
      ),
    ).toBe('/?tier=reference,full,superset')
    expect(
      toUrlString(
        destinationOfScreen(
          catalogScreen({
            ...defaultListingFilter(),
            statuses: statusChoiceOf([]),
          }),
        ),
      ),
    ).toBe('/?status=all')
    expect(
      toUrlString(destinationOfScreen(catalogScreen(defaultListingFilter()))),
    ).toBe('/')
  })

  it('reads every screen back', () => {
    const screens = [
      catalogScreen(),
      frameworkScreen('bubbletea'),
      rubricScreen(),
      aboutScreen(),
      adjacentScreen(),
      buildScreen('swift'),
      buildScreen('typescript'),
    ]
    screens.forEach((screen) => expect(roundTrip(screen)).toEqual(screen))
  })

  it('spells the sort with readable names, and reads a bad one as none', () => {
    expect(
      toUrlString(
        destinationOfScreen(
          catalogScreen({
            ...defaultListingFilter(),
            sort: O.some({ column: 'updated', direction: 'descending' }),
          }),
        ),
      ),
    ).toBe('/?sort=updated&order=descending')
    expect(parse('/?sort=added').screen).toEqual(
      catalogScreen({
        ...defaultListingFilter(),
        sort: O.some({ column: 'added', direction: 'descending' }),
      }),
    )
    expect(parse('/?sort=nope').screen).toEqual(catalogScreen())
    expect(parse('/?sort=name').screen).toEqual(
      catalogScreen({
        ...defaultListingFilter(),
        sort: O.some({ column: 'name', direction: 'ascending' }),
      }),
    )
  })

  it('reads unknown filter values as no filter', () => {
    expect(parse('/?tier=gold&target=fridge&layout=list').screen).toEqual(
      catalogScreen(defaultListingFilter()),
    )
    expect(parse('/build-your-own?language=cobol').screen).toEqual(
      buildScreen('typescript'),
    )
  })

  it('opens Not Found for an unknown path', () => {
    expect(parse('/nowhere/at-all').screen).toEqual(notFoundScreen())
  })
})
