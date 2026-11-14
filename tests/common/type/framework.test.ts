import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { describe, expect, it } from 'vitest'

import { frameworkById } from '@/common/data/catalog'
import {
  type Framework,
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
    expect(sourceUrlOf(entry('hojicha'))).toBe(entry('hojicha').url)
  })
})

describe('sourceLabelOf', () => {
  it('reads as the host and the repository, then the directory', () => {
    expect(sourceLabelOf(entry('lustre'))).toBe('github.com/lustre-labs/lustre')
    expect(sourceLabelOf(entry('monad-oak'))).toBe(
      'github.com/monad-lang/monad · motes/oak',
    )
    expect(sourceLabelOf(entry('xstate-store'))).toBe(
      'github.com/statelyai/xstate · packages/xstate-store',
    )
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

  it('gives nothing when its page is its repository', () => {
    expect(websiteOf(entry('lustre'))).toBeUndefined()
  })
})
