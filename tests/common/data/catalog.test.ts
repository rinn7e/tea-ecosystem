import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  adjacentEntries,
  frameworkById,
  frameworks,
  rubricProblemsOf,
} from '@/common/data/catalog'
import { isLanguageEntry } from '@/common/type/framework'

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
    const bad = frameworks.filter((f) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.id))
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
      [f.repo, f.originRepo].some(
        (repo) => repo !== undefined && !repoUrl.test(repo),
      ),
    )
    expect(wrong.map((f) => f.id)).toEqual([])
  })

  it('give every repository both dates, as days', () => {
    const day = /^\d{4}-\d{2}-\d{2}$/
    const wrong = frameworks.filter(
      (f) =>
        f.repo !== undefined &&
        !(day.test(f.createdAt ?? '') && day.test(f.updatedAt ?? '')),
    )
    expect(wrong.map((f) => f.id)).toEqual([])
  })

  it('treat only Elm and Gren as language entries', () => {
    expect(frameworks.filter(isLanguageEntry).map((f) => f.id)).toEqual([
      'elm',
      'gren',
    ])
  })
})
