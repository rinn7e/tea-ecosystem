import { fc, test } from '@fast-check/vitest'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { describe, expect, it } from 'vitest'

import {
  adjacentEntries,
  frameworkById,
  frameworks,
} from '@/common/data/catalog'
import {
  listedKeysOf,
  listedRejectionsOf,
  rejectionProblemsOf,
  rejections,
  repoKeyOf,
} from '@/common/data/rejected'
import { FIRST_LIST_DAY, sourceUrlOf } from '@/common/type/framework'
import { type Rejection } from '@/common/type/rejected'

const entries = [...frameworks, ...adjacentEntries]

describe('data/rejected.json', () => {
  it('give every rejected repository as a full URL of owner and name', () => {
    expect(
      rejections.filter((r) =>
        rejectionProblemsOf(r).includes(
          'repo is not a full URL of owner and name',
        ),
      ),
    ).toEqual([])
  })

  it('turn down each repository once', () => {
    const keys = rejections.map((r) => repoKeyOf(r.repo))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('give every rejection its day and a reason in plain ASCII', () => {
    expect(rejections.filter((r) => rejectionProblemsOf(r).length > 0)).toEqual(
      [],
    )
  })

  it('never turn down a listed entry', () => {
    expect(listedRejectionsOf(rejections, entries)).toEqual([])
  })
})

describe('rejectionProblemsOf', () => {
  const good: Rejection = {
    repo: 'https://github.com/owner/name',
    rejectedAt: FIRST_LIST_DAY,
    reason: 'A fork of an entry.',
  }

  it('passes a rejection that holds the rules', () => {
    expect(rejectionProblemsOf(good)).toEqual([])
  })

  it.each<[Partial<Rejection>, string]>([
    [
      { repo: 'github.com/owner/name' },
      'repo is not a full URL of owner and name',
    ],
    [
      { repo: 'https://github.com/owner' },
      'repo is not a full URL of owner and name',
    ],
    [
      { repo: 'https://github.com/owner/name/tree/main' },
      'repo is not a full URL of owner and name',
    ],
    [{ rejectedAt: '16 Nov 2026' }, 'rejectedAt is not a day of the catalog'],
    [{ rejectedAt: '2026-11-12' }, 'rejectedAt is not a day of the catalog'],
    [{ reason: '' }, 'reason is not a sentence of plain ASCII'],
    [{ reason: '   ' }, 'reason is not a sentence of plain ASCII'],
    [
      { repo: 'http://github.com/owner/name' },
      'repo is not a full URL of owner and name',
    ],
    [
      { reason: 'A fork \u2014 abandoned.' },
      'reason is not a sentence of plain ASCII',
    ],
  ])('refuses %o', (change, said) => {
    expect(rejectionProblemsOf({ ...good, ...change })).toEqual([said])
  })
})

// A repository address on a host of the data, written as a person would
// write it: any case, with or without `www.`, `.git` and a slash at the
// end, over http or https
const segmentArb = fc.stringMatching(/^[a-z0-9][a-z0-9_-]{0,11}$/)

const hostArb = fc.constantFrom('github.com', 'gitlab.com', 'codeberg.org')

type Spelling = {
  http: boolean
  www: boolean
  git: boolean
  slash: boolean
  upper: boolean[]
}

const spellingArb: fc.Arbitrary<Spelling> = fc.record({
  http: fc.boolean(),
  www: fc.boolean(),
  git: fc.boolean(),
  slash: fc.boolean(),
  upper: fc.array(fc.boolean(), { minLength: 1, maxLength: 16 }),
})

// `url` as `spelling` writes it
const spell = (url: string, spelling: Spelling): string => {
  const cased = [...url.replace(/^https:\/\//, '')]
    .map((c, i) =>
      spelling.upper[i % spelling.upper.length] ? c.toUpperCase() : c,
    )
    .join('')
  return [
    spelling.http ? 'http://' : 'https://',
    spelling.www ? 'www.' : '',
    cased,
    spelling.git ? '.git' : '',
    spelling.slash ? '/' : '',
  ].join('')
}

const rejectionOf = (repo: string): Rejection => ({
  repo,
  rejectedAt: FIRST_LIST_DAY,
  reason: 'A fork of an entry.',
})

// A repository on a host no entry of the data uses, so not listed
const unlistedRepoArb = fc
  .tuple(segmentArb, segmentArb)
  .map(([owner, name]) => `https://example.org/${owner}/${name}`)

describe('repoKeyOf', () => {
  test.prop([hostArb, segmentArb, segmentArb, spellingArb])(
    'gives every spelling of a repository the key of its plain URL',
    (host, owner, name, spelling) => {
      const url = `https://${host}/${owner}/${name}`
      expect(repoKeyOf(spell(url, spelling))).toBe(repoKeyOf(url))
    },
  )

  test.prop([hostArb, segmentArb, segmentArb, segmentArb])(
    'tells two repositories apart',
    (host, owner, name, other) => {
      fc.pre(name !== other)
      expect(repoKeyOf(`https://${host}/${owner}/${name}`)).not.toBe(
        repoKeyOf(`https://${host}/${owner}/${other}`),
      )
    },
  )
})

describe('listedRejectionsOf', () => {
  // An address an entry is listed under, as it is in the data: its source
  // or the repository it moved from
  const listedUrlArb = fc
    .constantFrom(...entries)
    .chain((f) =>
      fc.constantFrom(
        ...[sourceUrlOf(f), f.originRepo].filter(
          (u): u is string => u !== undefined,
        ),
      ),
    )

  test.prop([
    listedUrlArb,
    spellingArb,
    fc.array(unlistedRepoArb, { maxLength: 4 }),
    fc.nat(),
  ])(
    'finds the rejection of a listed entry, in any spelling, and only it',
    (listed, spelling, unlisted, at) => {
      const rejection = rejectionOf(spell(listed, spelling))
      const others = unlisted.map(rejectionOf)
      const i = at % (others.length + 1)
      const rejected = [...others.slice(0, i), rejection, ...others.slice(i)]
      expect(listedRejectionsOf(rejected, entries)).toEqual([rejection])
    },
  )

  test.prop([fc.array(unlistedRepoArb, { maxLength: 6 })])(
    'finds none among repositories no entry is listed under',
    (unlisted) => {
      expect(listedRejectionsOf(unlisted.map(rejectionOf), entries)).toEqual([])
    },
  )

  it('lets a repository be turned down while one part of it is listed', () => {
    // `useReducer` is listed by its reference page, not by the repository
    // of React, which is not TEA
    expect(
      pipe(
        frameworkById('use-reducer'),
        O.map((f) => [f.repo, listedKeysOf(f)]),
      ),
    ).toEqual(
      O.some([
        'https://github.com/react/react',
        ['react.dev/reference/react/usereducer'],
      ]),
    )
    expect(
      listedRejectionsOf(
        [rejectionOf('https://github.com/react/react')],
        entries,
      ),
    ).toEqual([])
  })
})
