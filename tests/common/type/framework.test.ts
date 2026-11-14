import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { describe, expect, it } from 'vitest'

import { frameworkById } from '@/common/data/catalog'
import {
  FIRST_LIST_DAY,
  type Framework,
  hasPublicRepo,
  isRecentlyAdded,
  recentSinceOf,
  sourceLabelOf,
  sourceUrlOf,
  websiteOf,
} from '@/common/type/framework'

// An entry of the data by its id; a missing one fails the test
const entry = (id: string): Framework =>
  pipe(
    frameworkById(id),
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
    expect(entry('monad-oak').discoveredAt).toBe('2026-11-14')
    expect(
      isRecentlyAdded(entry('monad-oak'), recentSinceOf(noonOf(12, 14))),
    ).toBe(true)
    expect(
      isRecentlyAdded(entry('monad-oak'), recentSinceOf(noonOf(12, 15))),
    ).toBe(false)
  })

  it('never marks the first list', () => {
    expect(entry('lustre').discoveredAt).toBe(FIRST_LIST_DAY)
    expect(isRecentlyAdded(entry('lustre'), recentSinceOf(day))).toBe(false)
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
