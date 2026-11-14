import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  adjacentEntries,
  frameworkById,
  frameworks,
  rubricProblemsOf,
  sameLanguageEntriesOf,
} from '@/common/data/catalog'
import {
  FIRST_LIST_DAY,
  hasPublicRepo,
  isLanguageEntry,
} from '@/common/type/framework'

describe('data files', () => {
  it('decode, with frameworks in both files', () => {
    expect(frameworks.length).toBeGreaterThan(40)
    expect(adjacentEntries.length).toBeGreaterThan(20)
  })

  it('give every entry a unique id, across both files', () => {
    const ids = [
      ...frameworks.map((f) => f.id),
      ...adjacentEntries.map((e) => e.id),
    ]
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('use ids that are readable URL segments', () => {
    const bad = [...frameworks, ...adjacentEntries].filter(
      (f) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.id),
    )
    expect(bad.map((f) => f.id)).toEqual([])
  })

  it('keep every framework within the rules of its tier', () => {
    const failing = A.filterMap((f: (typeof frameworks)[number]) => {
      const problems = rubricProblemsOf(f)
      return problems.length === 0
        ? { _tag: 'None' as const }
        : { _tag: 'Some' as const, value: `${f.id}: ${problems.join(', ')}` }
    })(frameworks)
    expect(failing).toEqual([])
    // A library that is not TEA belongs in `data/adjacent.json`
    expect(
      frameworks.filter((f) => f.tier === 'adjacent').map((f) => f.id),
    ).toEqual([])
  })

  it('keep every adjacent entry failing the rubric, so it is not TEA', () => {
    const passing = adjacentEntries.filter(
      (e) => rubricProblemsOf(e).length === 0,
    )
    expect(passing.map((e) => e.id)).toEqual([])
    expect(adjacentEntries.every((e) => e.tier === 'adjacent')).toBe(true)
  })

  it('find an entry of either list by its id', () => {
    expect(O.isSome(frameworkById('lustre'))).toBe(true)
    expect(O.isSome(frameworkById('redux'))).toBe(true)
  })

  it('keep Elm first, as the reference', () => {
    expect(frameworks[0]?.id).toBe('elm')
    expect(
      frameworks.filter((f) => f.tier === 'reference').map((f) => f.id),
    ).toEqual(['elm'])
  })

  it('keep react-tea-cup right after Elm, as the pick of the maintainer', () => {
    expect(frameworks.slice(0, 2).map((f) => f.id)).toEqual([
      'elm',
      'react-tea-cup',
    ])
  })

  it('name a logo file that exists in public/logo', () => {
    const missing = [...frameworks, ...adjacentEntries].filter(
      (f) =>
        f.logo !== undefined &&
        !existsSync(new URL(`../../../public/logo/${f.logo}`, import.meta.url)),
    )
    expect(missing.map((f) => f.id)).toEqual([])
  })

  it('give every repository as a full URL of owner and name', () => {
    const repoUrl = /^https:\/\/[a-z0-9.-]+\/[^/\s]+\/[^/\s]+$/
    const wrong = [...frameworks, ...adjacentEntries].filter((f) =>
      [hasPublicRepo(f) ? f.repo : undefined, f.originRepo].some(
        (repo) => repo !== undefined && !repoUrl.test(repo),
      ),
    )
    expect(wrong.map((f) => f.id)).toEqual([])
  })

  it('fall back to the website as repo only for the entries with no public source', () => {
    expect(
      [...frameworks, ...adjacentEntries]
        .filter((f) => !hasPublicRepo(f))
        .map((f) => f.id),
    ).toEqual(['hojicha', 'mvu-flutter', 'cauldron'])
  })

  it('give the source of an entry inside its repository, or as its own page', () => {
    const wrong = [...frameworks, ...adjacentEntries].filter(
      (f) =>
        f.source !== undefined &&
        !(
          hasPublicRepo(f) &&
          (f.source.startsWith(`${f.repo}/`) || f.source === f.website)
        ),
    )
    expect(wrong.map((f) => f.id)).toEqual([])
  })

  it('give every entry the day it was added, not before the first list', () => {
    const day = /^\d{4}-\d{2}-\d{2}$/
    const wrong = [...frameworks, ...adjacentEntries].filter(
      (f) => !day.test(f.discoveredAt) || f.discoveredAt < FIRST_LIST_DAY,
    )
    expect(wrong.map((f) => f.id)).toEqual([])
  })

  it('give every repository its stars and both dates, as days', () => {
    const day = /^\d{4}-\d{2}-\d{2}$/
    // Both lists: a fallback entry that forgets its `website` reads as a
    // public repository with no dates
    const wrong = [...frameworks, ...adjacentEntries].filter(
      (f) =>
        hasPublicRepo(f) &&
        !(
          f.stars !== undefined &&
          day.test(f.createdAt ?? '') &&
          day.test(f.updatedAt ?? '')
        ),
    )
    expect(wrong.map((f) => f.id)).toEqual([])
  })

  it('treat only the languages built for TEA as language entries', () => {
    expect(frameworks.filter(isLanguageEntry).map((f) => f.id)).toEqual([
      'elm',
      'gren',
      'sky',
    ])
  })
})

describe('sameLanguageEntriesOf', () => {
  const idsOf = (id: string) =>
    pipe(
      frameworkById(id),
      O.map(sameLanguageEntriesOf),
      O.map(
        A.map(({ list, entries }) => ({
          list,
          ids: entries.map((f) => f.id),
        })),
      ),
    )

  it('gathers the entries of the language from both lists, catalog first', () => {
    const groups = idsOf('brick')
    // Each entry in its own group, whatever else the lists gain later
    expect(
      pipe(
        groups,
        O.map(
          A.map((g) => ({
            list: g.list,
            has: g.ids.includes(g.list === 'catalog' ? 'miso' : 'hyperbole'),
          })),
        ),
      ),
    ).toEqual(
      O.some([
        { list: 'catalog', has: true },
        { list: 'adjacent', has: true },
      ]),
    )
  })

  it('matches an entry in two languages by each of them, both ways', () => {
    // Keemun ships one library for Kotlin and one for Swift
    const has = (id: string, other: string) =>
      pipe(
        idsOf(id),
        O.map((gs) => gs.flatMap((g) => g.ids).includes(other)),
      )
    expect(has('keemun', 'mobius-kt')).toEqual(O.some(true))
    expect(has('keemun', 'reswift')).toEqual(O.some(true))
    expect(has('mvikotlin', 'keemun')).toEqual(O.some(true))
    expect(has('mvikotlin', 'reswift')).toEqual(O.some(false))
  })

  it('leaves out the entry itself and a list with none', () => {
    expect(
      pipe(
        idsOf('hyperbole'),
        O.map((gs) => gs.flatMap((g) => g.ids).includes('hyperbole')),
      ),
    ).toEqual(O.some(false))
    // No TEA-adjacent library is in Scala
    expect(pipe(idsOf('tyrian'), O.map(A.map((g) => g.list)))).toEqual(
      O.some(['catalog']),
    )
  })
})
