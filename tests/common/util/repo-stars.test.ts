import { fc, test } from '@fast-check/vitest'
import * as E from 'fp-ts/Either'
import { describe, expect, it } from 'vitest'

import { starsOfJson } from '@/common/util'

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
