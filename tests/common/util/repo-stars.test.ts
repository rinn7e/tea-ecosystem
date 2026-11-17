import { fc, test } from '@fast-check/vitest'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { describe, expect, it } from 'vitest'

import { starsOfJson } from '@/common/util'
import {
  STARS_CACHE_MS,
  cachedStarsOf,
  starsCacheTextOf,
} from '@/common/util/repo-stars'

describe('starsOfJson', () => {
  test.prop([fc.nat(), fc.dictionary(fc.string(), fc.jsonValue())])(
    'reads `stargazers_count` from an answer of the GitHub API, whatever else it holds',
    (stars, rest) => {
      expect(starsOfJson({ ...rest, stargazers_count: stars })).toEqual(
        E.right(stars),
      )
    },
  )

  it('refuses an answer with no count, or a count that is not a number', () => {
    expect(E.isLeft(starsOfJson({ message: 'API rate limit exceeded' }))).toBe(
      true,
    )
    expect(E.isLeft(starsOfJson({ stargazers_count: '8' }))).toBe(true)
    expect(E.isLeft(starsOfJson(null))).toBe(true)
  })
})

describe('cachedStarsOf', () => {
  test.prop([
    fc.nat(),
    fc.integer({ min: 0, max: 4_102_444_800_000 }),
    fc.integer({ min: 0, max: STARS_CACHE_MS - 1 }),
  ])('gives back a count kept less than an hour ago', (stars, at, age) => {
    expect(cachedStarsOf(starsCacheTextOf(stars, at), at + age)).toEqual(
      O.some(stars),
    )
  })

  test.prop([
    fc.nat(),
    fc.integer({ min: 0, max: 4_102_444_800_000 }),
    fc.integer({ min: STARS_CACHE_MS, max: 10 * STARS_CACHE_MS }),
  ])('asks again once the count is an hour old', (stars, at, age) => {
    expect(cachedStarsOf(starsCacheTextOf(stars, at), at + age)).toEqual(O.none)
  })

  it('keeps nothing from storage that holds no count, or one from the future', () => {
    expect(cachedStarsOf(null, 0)).toEqual(O.none)
    expect(cachedStarsOf('not json', 0)).toEqual(O.none)
    expect(cachedStarsOf('{"stars":"8","at":0}', 0)).toEqual(O.none)
    expect(cachedStarsOf(starsCacheTextOf(8, 1000), 0)).toEqual(O.none)
  })
})
