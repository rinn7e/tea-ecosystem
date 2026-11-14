import { fc, test } from '@fast-check/vitest'
import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { existsSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import { describe, expect, it } from 'vitest'

import {
  MISSES_NOTE_PREFIX,
  SUPERSET_NOTE_PREFIX,
  adjacentEntries,
  frameworkById,
  frameworks,
  meetsRequirement,
  missedRequirementsOf,
  missesNotePrefixOf,
  requirements,
  rubricProblemsOf,
  sameLanguageEntriesOf,
} from '@/common/data/catalog'
import { repoKeyOf } from '@/common/data/rejected'
import {
  FIRST_LIST_DAY,
  hasPublicRepo,
  isLanguageEntry,
  sourceUrlOf,
} from '@/common/type/framework'

import {
  catalogTierArb,
  entryArb,
  gradeArb,
  noteReasonArb,
  passingRubricArb,
  plainNotesArb,
  rubricArb,
} from '../../helper/arbitrary'

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

  // A search that proposes a listed project again under a new id fails
  // here
  it('list each source once, across both files', () => {
    const entries = [...frameworks, ...adjacentEntries]
    const keys = entries.map((f) => repoKeyOf(sourceUrlOf(f)))
    expect(
      entries
        .filter((_, i) => keys.indexOf(keys[i] ?? '') !== i)
        .map((f) => f.id),
    ).toEqual([])
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
    // Not even as full TEA, the lowest tier of the catalog
    const passing = adjacentEntries.filter(
      (e) => rubricProblemsOf({ ...e, tier: 'full' }).length === 0,
    )
    expect(passing.map((e) => e.id)).toEqual([])
    expect(adjacentEntries.every((e) => e.tier === 'adjacent')).toBe(true)
    // And each says first which requirements it misses
    expect(
      pipe(
        adjacentEntries,
        A.filter((e) => rubricProblemsOf(e).length > 0),
        A.map((e) => e.id),
      ),
    ).toEqual([])
  })

  it('spell the requirements an adjacent entry misses as its note starts', () => {
    const prefixOf = (id: string) =>
      pipe(frameworkById(id), O.map(missesNotePrefixOf))
    expect(prefixOf('brick')).toEqual(O.some('Misses Cmd: '))
    expect(prefixOf('phoenix-liveview')).toEqual(O.some('Misses Cmd and Sub: '))
    expect(prefixOf('halogen')).toEqual(O.some('Misses update, Cmd and Sub: '))
    expect(prefixOf('pinia')).toEqual(
      O.some('Misses Model, Msg, update, Cmd and Sub: '),
    )
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

  it('mark a logo as drawn for a light page only when there is a logo', () => {
    const wrong = [...frameworks, ...adjacentEntries].filter(
      (f) => f.logoOnLight === true && f.logo === undefined,
    )
    expect(wrong.map((f) => f.id)).toEqual([])
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

  it('give an unmaintained notice only to an archived entry', () => {
    // The stats script counts the notice as archived, so a notice on an
    // active or quiet entry would hide that its status disagrees
    const wrong = [...frameworks, ...adjacentEntries].filter(
      (f) => f.unmaintainedNotice !== undefined && f.status !== 'archived',
    )
    expect(wrong.map((f) => f.id)).toEqual([])
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
    // The time in UTC, so the entries of one day sort newest first
    const added = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
    const wrong = [...frameworks, ...adjacentEntries].filter(
      (f) => !added.test(f.discoveredAt) || f.discoveredAt < FIRST_LIST_DAY,
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

const withoutTierNotes = (notes: string[]): string[] =>
  pipe(
    notes,
    A.filter(
      (note) =>
        !note.startsWith(SUPERSET_NOTE_PREFIX) &&
        !note.startsWith(MISSES_NOTE_PREFIX),
    ),
  )

describe('the rule of the tiers', () => {
  test.prop([fc.constantFrom(...requirements), gradeArb])(
    'lets a native grade meet every requirement, and a managed one only Sub',
    (concept, grade) => {
      expect(meetsRequirement(concept)(grade)).toBe(
        grade === 'native' || (grade === 'managed' && concept === 'sub'),
      )
    },
  )

  test.prop([entryArb, fc.constantFrom(...requirements)])(
    'never lets an equivalent grade meet a requirement',
    (entry, concept) => {
      const graded = {
        ...entry,
        rubric: { ...entry.rubric, [concept]: 'equivalent' },
      }
      expect(missedRequirementsOf(graded)).toContain(concept)
    },
  )

  test.prop([entryArb, passingRubricArb])(
    'meets every requirement with native grades and a native or managed Sub',
    (entry, rubric) => {
      expect(missedRequirementsOf({ ...entry, rubric })).toEqual([])
    },
  )

  test.prop([entryArb, gradeArb, gradeArb])(
    'never asks for a view or ports, so a headless loop counts',
    (entry, view, ports) => {
      expect(
        missedRequirementsOf({
          ...entry,
          rubric: { ...entry.rubric, view, ports },
        }),
      ).toEqual(missedRequirementsOf(entry))
    },
  )

  test.prop([entryArb, catalogTierArb, plainNotesArb])(
    'holds every tier of the catalog to every requirement of full TEA',
    (entry, tier, plainNotes) => {
      // The notes its tier asks for, and notes of no tier that only look
      // like one, so only the grades can fail it
      const notes = [
        ...withoutTierNotes(entry.notes),
        ...plainNotes,
        ...(tier === 'superset' ? [`${SUPERSET_NOTE_PREFIX}components.`] : []),
      ]
      expect(rubricProblemsOf({ ...entry, tier, notes }).length === 0).toBe(
        missedRequirementsOf(entry).length === 0,
      )
    },
  )

  test.prop([
    entryArb,
    passingRubricArb,
    catalogTierArb,
    fc.option(noteReasonArb, { nil: undefined }),
  ])(
    'asks a superset, and only a superset, to name what it adds beyond TEA',
    (entry, rubric, tier, reason) => {
      const notes = [
        ...withoutTierNotes(entry.notes),
        ...(reason === undefined ? [] : [`${SUPERSET_NOTE_PREFIX}${reason}`]),
      ]
      // A note that stops at its prefix still names the tier, and is one
      // more problem on any tier
      const namesBeyond = reason !== undefined
      const isBlank = reason !== undefined && reason.trim() === ''
      expect(rubricProblemsOf({ ...entry, rubric, tier, notes })).toHaveLength(
        ((tier === 'superset') === namesBeyond ? 0 : 1) + (isBlank ? 1 : 0),
      )
    },
  )

  test.prop([
    entryArb,
    fc.boolean(),
    noteReasonArb,
    plainNotesArb,
    fc.option(noteReasonArb, { nil: undefined }),
  ])(
    'keeps a library out of the catalog only while it misses a requirement and says which and why first',
    (drawn, saysFirst, reason, plainNotes, supersetReason) => {
      const entry = { ...drawn, tier: 'adjacent' as const }
      // A "Superset: " note says nothing for the tier here, but one that
      // stops at its prefix is a problem on this tier too
      const notes = [
        ...withoutTierNotes(entry.notes),
        ...plainNotes,
        ...(supersetReason === undefined
          ? []
          : [`${SUPERSET_NOTE_PREFIX}${supersetReason}`]),
      ]
      const missesNote = `${missesNotePrefixOf(entry)}${reason}`
      const said = saysFirst ? [missesNote, ...notes] : [...notes, missesNote]
      expect(rubricProblemsOf({ ...entry, notes: said }).length === 0).toBe(
        missedRequirementsOf(entry).length > 0 &&
          reason.trim() !== '' &&
          (saysFirst || notes.length === 0) &&
          (supersetReason === undefined || supersetReason.trim() !== ''),
      )
    },
  )

  test.prop([entryArb, rubricArb])(
    'asks the first note of a TEA-adjacent library for the exact requirements it misses',
    (drawn, otherRubric) => {
      const entry = { ...drawn, tier: 'adjacent' as const }
      const other = { ...entry, rubric: otherRubric }
      // The note another rubric would write: right only when it misses
      // the same requirements
      const notes = [
        `${missesNotePrefixOf(other)}why.`,
        ...withoutTierNotes(entry.notes),
      ]
      expect(rubricProblemsOf({ ...entry, notes }).length === 0).toBe(
        missedRequirementsOf(entry).length > 0 &&
          isDeepStrictEqual(
            missedRequirementsOf(entry),
            missedRequirementsOf(other),
          ),
      )
    },
  )
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
