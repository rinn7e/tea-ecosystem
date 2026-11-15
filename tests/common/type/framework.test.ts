import { fc, test } from '@fast-check/vitest'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { describe, expect, it } from 'vitest'

import { frameworkById } from '@/common/data/catalog'
import {
  ARCHIVED_AFTER_DAYS,
  FEATURED_IDS,
  FIRST_LIST_DAY,
  type Framework,
  QUIET_AFTER_DAYS,
  activityStatusOf,
  addedDayOf,
  cardRibbonOf,
  hasPublicRepo,
  isRecentlyAdded,
  recentSinceOf,
  sourceLabelOf,
  sourceUrlOf,
  statusAt,
  websiteOf,
} from '@/common/type/framework'

import { adjacentEntries, frameworks, testEntries } from '../../helper/entries'

// An entry of the data by its id; a missing one fails the test
const entry = (id: string): Framework =>
  pipe(
    frameworkById(testEntries)(id),
    O.getOrElse((): Framework => {
      throw new Error(`No entry ${id}`)
    }),
  )

describe('sourceUrlOf', () => {
  it('opens the directory of a monorepo entry, else the repository', () => {
    expect(sourceUrlOf(entry('monad-oak'))).toBe(
      'https://github.com/monad-lang/monad/tree/main/motes/oak',
    )
    expect(sourceUrlOf(entry('lustre'))).toBe(
      'https://github.com/lustre-labs/lustre',
    )
  })

  it('falls back to the page of an entry whose source is not public', () => {
    expect(sourceUrlOf(entry('hojicha'))).toBe(
      'https://docs.rs/crate/hojicha/latest',
    )
  })
})

describe('sourceLabelOf', () => {
  it('reads as the host and the repository, then the directory', () => {
    expect(sourceLabelOf(entry('lustre'))).toBe('github.com/lustre-labs/lustre')
    expect(sourceLabelOf(entry('monad-oak'))).toBe(
      'github.com/monad-lang/monad · motes/oak',
    )
    expect(sourceLabelOf(entry('use-reducer'))).toBe(
      'react.dev/reference/react/useReducer',
    )
    expect(sourceLabelOf(entry('xstate-store'))).toBe(
      'github.com/statelyai/xstate · packages/xstate-store',
    )
  })

  it('reads the folder of a monorepo on GitLab and on a Gitea', () => {
    expect(
      sourceLabelOf({
        ...entry('lustre'),
        repo: 'https://gitlab.com/o/r',
        source: 'https://gitlab.com/o/r/-/tree/main/pkg',
      }),
    ).toBe('gitlab.com/o/r · pkg')
    expect(
      sourceLabelOf({
        ...entry('lustre'),
        repo: 'https://codeberg.org/o/r',
        source: 'https://codeberg.org/o/r/src/branch/main/pkg',
      }),
    ).toBe('codeberg.org/o/r · pkg')
  })

  it('reads as the host of its page when its source is not public', () => {
    expect(sourceLabelOf(entry('hojicha'))).toBe('docs.rs')
  })
})

describe('websiteOf', () => {
  it('gives its own site when it is not its source', () => {
    expect(websiteOf(entry('monad-oak'))).toBe(
      'https://monad-lang.org/docs/web-and-oak.html',
    )
    expect(websiteOf(entry('elm'))).toBe('https://elm-lang.org')
  })

  it('gives nothing when it has none, or it is what the source opens', () => {
    expect(websiteOf(entry('lustre'))).toBeUndefined()
    expect(websiteOf(entry('hojicha'))).toBeUndefined()
    expect(websiteOf(entry('use-reducer'))).toBeUndefined()
  })
})

describe('isRecentlyAdded', () => {
  // Noon of a local day, as the reader sees it
  const noonOf = (month: number, date: number) =>
    new Date(2026, month - 1, date, 12).getTime()
  const day = noonOf(11, 20)

  it('counts back 30 days from now', () => {
    expect(recentSinceOf(day)).toBe('2026-10-21')
  })

  it('marks an entry found after the first list, for 30 days', () => {
    expect(isRecentlyAdded(entry('monad-oak'), recentSinceOf(day))).toBe(true)
    const later = noonOf(12, 15)
    expect(isRecentlyAdded(entry('monad-oak'), recentSinceOf(later))).toBe(
      false,
    )
  })

  it('keeps the ribbon on the 30th day, and drops it the next', () => {
    expect(addedDayOf(entry('monad-oak'))).toBe('2026-11-14')
    expect(
      isRecentlyAdded(entry('monad-oak'), recentSinceOf(noonOf(12, 14))),
    ).toBe(true)
    expect(
      isRecentlyAdded(entry('monad-oak'), recentSinceOf(noonOf(12, 15))),
    ).toBe(false)
  })

  it('never marks the first list', () => {
    expect(addedDayOf(entry('lustre'))).toBe(FIRST_LIST_DAY)
    expect(isRecentlyAdded(entry('lustre'), recentSinceOf(day))).toBe(false)
  })
})

describe('cardRibbonOf', () => {
  // Any day as `recentSinceOf` writes it
  const sinceArb = fc
    .date({
      min: new Date(2026, 0, 1),
      max: new Date(2030, 11, 31),
      noInvalidDate: true,
    })
    .map((date) => recentSinceOf(date.getTime()))

  const entryArb = fc.constantFrom(...frameworks, ...adjacentEntries)

  test.prop([fc.constantFrom(...FEATURED_IDS), sinceArb])(
    'gives each pick of the maintainer "Featured", on any day',
    (id, since) => {
      expect(cardRibbonOf(entry(id), since)).toEqual(O.some('featured'))
    },
  )

  test.prop([entryArb, sinceArb])(
    'gives any other entry "Recently added" exactly while it is recent',
    (framework, since) => {
      fc.pre(!FEATURED_IDS.includes(framework.id))
      expect(cardRibbonOf(framework, since)).toEqual(
        isRecentlyAdded(framework, since) ? O.some('recent') : O.none,
      )
    },
  )

  it('leaves Elm, first in the order, with its tier badge alone', () => {
    expect(cardRibbonOf(entry('elm'), FIRST_LIST_DAY)).toEqual(O.none)
  })
})

describe('hasPublicRepo', () => {
  it('reads a repo that is its own website as no public source', () => {
    expect(hasPublicRepo(entry('hojicha'))).toBe(false)
  })

  it('reads a repository on any host as public, with or without a website', () => {
    expect(hasPublicRepo(entry('lustre'))).toBe(true)
    expect(hasPublicRepo(entry('sky'))).toBe(true)
    expect(hasPublicRepo(entry('teatui'))).toBe(true)
    expect(
      hasPublicRepo({
        ...entry('lustre'),
        repo: 'https://git.example.org/owner/name',
      }),
    ).toBe(true)
  })
})

describe('the status of an entry', () => {
  const NOW = Date.parse('2026-11-15T12:00:00Z')
  const daysBefore = (days: number) =>
    new Date(NOW - days * 86_400_000).toISOString().replace(/\.\d{3}Z$/, 'Z')

  it('reads the last push: active within a year, quiet within two, else archived', () => {
    expect(activityStatusOf(daysBefore(0), NOW)).toBe('active')
    expect(activityStatusOf(daysBefore(QUIET_AFTER_DAYS), NOW)).toBe('active')
    expect(activityStatusOf(daysBefore(QUIET_AFTER_DAYS + 1), NOW)).toBe(
      'quiet',
    )
    expect(activityStatusOf(daysBefore(ARCHIVED_AFTER_DAYS), NOW)).toBe('quiet')
    expect(activityStatusOf(daysBefore(ARCHIVED_AFTER_DAYS + 1), NOW)).toBe(
      'archived',
    )
  })

  test.prop([fc.integer({ min: 0, max: 5000 })])(
    'never comes back less archived as the last push grows older',
    (days) => {
      const rank = { active: 0, quiet: 1, archived: 2 }
      expect(
        rank[activityStatusOf(daysBefore(days + 1), NOW)],
      ).toBeGreaterThanOrEqual(rank[activityStatusOf(daysBefore(days), NOW)])
    },
  )

  it('keeps a stored archived status, whatever the last push', () => {
    const { status: _, ...stored } = entry('elm')
    expect(
      statusAt(NOW)({
        ...stored,
        status: 'archived',
        updatedAt: daysBefore(1),
      }).status,
    ).toBe('archived')
  })

  it('derives the status of an entry with a public repository from its last push', () => {
    const { status: _, ...stored } = entry('elm')
    expect(statusAt(NOW)({ ...stored, updatedAt: daysBefore(10) }).status).toBe(
      'active',
    )
    expect(
      statusAt(NOW)({ ...stored, updatedAt: daysBefore(400) }).status,
    ).toBe('quiet')
    expect(
      statusAt(NOW)({ ...stored, updatedAt: daysBefore(800) }).status,
    ).toBe('archived')
  })

  it('keeps the stored status of an entry with no public repository', () => {
    const { status: _, updatedAt: __, ...stored } = entry('hojicha')
    expect(statusAt(NOW)({ ...stored, status: 'active' }).status).toBe('active')
    expect(statusAt(NOW)({ ...stored, status: 'quiet' }).status).toBe('quiet')
    expect(statusAt(NOW)(stored).status).toBe('quiet')
  })
})
