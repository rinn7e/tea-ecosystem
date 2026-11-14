import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { type ScriptRepo, json, scriptRepo } from '../helper/script-repo'

// `scripts/judge-discovered.sh`: whether the pull request of a run may
// merge on its own, from the data of its new entries alone

const day = '2026-11-16'
const elm = { id: 'elm', repo: 'https://github.com/elm/compiler' }

const repo: { at: ScriptRepo | undefined } = { at: undefined }

const current = (): ScriptRepo => {
  if (repo.at === undefined) {
    throw new Error('no repository')
  } else {
    return repo.at
  }
}

// An entry that passes every rule
const goodEntryOf = (id: string) => ({
  id,
  repo: `https://github.com/o/${id}`,
  discoveredAt: `${day}T06:02:11Z`,
  status: 'active',
  stars: 5,
  updatedAt: '2025-11-16',
  verified: true,
  snippetSource: `https://github.com/o/${id}/blob/main/README.md`,
})

const exampleOf = (lines: number): string =>
  Array.from({ length: lines }, (_, i) => `line ${i + 1}`).join('\n') + '\n'

const write = (file: string, content: string): void => {
  const target = path.join(current().dir, file)
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, content)
}

// The commit `next` on top of the base: the entries `added` with their
// examples (`null` for none), in the catalog or the adjacent list
const commitOf = (
  added: { entry: Record<string, unknown>; example: string | null }[],
  file: 'frameworks' | 'adjacent' = 'frameworks',
): void => {
  write(
    `data/${file}.json`,
    json([
      ...(file === 'frameworks' ? [elm] : []),
      ...added.map((a) => a.entry),
    ]),
  )
  added.forEach(({ entry, example }) => {
    if (example !== null) {
      write(`data/snippet/${String(entry.id)}.rs`, example)
    }
  })
  current().git('add', '-A')
  current().git('commit', '-q', '-m', 'Add')
  current().git('tag', 'next')
}

const judge = (): string[] =>
  current()
    .run('judge-discovered.sh', ['base', 'next'], { DAY: day })
    .out.split('\n')
    .filter((line) => line !== '')

beforeEach(() => {
  repo.at = scriptRepo([elm], [])
})

afterEach(() => {
  current().remove()
})

describe('judge-discovered.sh', () => {
  it('passes new entries that meet every rule, at its edges', () => {
    commitOf([
      { entry: goodEntryOf('good-tea'), example: exampleOf(90) },
      { entry: goodEntryOf('other-tea'), example: exampleOf(3) },
    ])
    expect(judge()).toEqual([])
  })

  it('judges an entry of the adjacent list too', () => {
    commitOf(
      [{ entry: { ...goodEntryOf('store'), stars: 3 }, example: exampleOf(3) }],
      'adjacent',
    )
    expect(judge()).toEqual(['store: 3 stars (at least 5)'])
  })

  it.each<[string, Record<string, unknown>, string]>([
    ['too few stars', { stars: 4 }, 'tea: 4 stars (at least 5)'],
    ['no stars', { stars: undefined }, 'tea: 0 stars (at least 5)'],
    [
      'no push in a year',
      { updatedAt: '2025-11-15' },
      'tea: last pushed to on 2025-11-15, more than 365 days ago',
    ],
    [
      'no day of its last push',
      { updatedAt: undefined },
      'tea: no day it was last pushed to',
    ],
    ['an archived project', { status: 'archived' }, 'tea: archived'],
    ['grades not verified', { verified: false }, 'tea: grades not verified'],
    ['no snippetSource', { snippetSource: undefined }, 'tea: no snippetSource'],
  ])('names a new entry with %s', (_, change, said) => {
    commitOf([
      { entry: { ...goodEntryOf('tea'), ...change }, example: exampleOf(3) },
    ])
    expect(judge()).toEqual([said])
  })

  it('names a new entry with no example, or an example too long', () => {
    commitOf([
      { entry: goodEntryOf('bare'), example: null },
      { entry: goodEntryOf('long'), example: exampleOf(91) },
    ])
    expect(judge()).toEqual([
      'bare: no example',
      'long: example of 91 lines (at most 90)',
    ])
  })

  it('names every rule an entry breaks, and judges no existing entry', () => {
    commitOf([
      {
        entry: { ...goodEntryOf('tea'), stars: 2, verified: false },
        example: null,
      },
    ])
    expect(judge()).toEqual([
      'tea: 2 stars (at least 5)',
      'tea: grades not verified',
      'tea: no example',
    ])
  })

  it('fails, rather than passes, when a day does not read', () => {
    commitOf([
      {
        entry: { ...goodEntryOf('tea'), updatedAt: 'soon' },
        example: exampleOf(3),
      },
    ])
    expect(
      current().run('judge-discovered.sh', ['base', 'next'], { DAY: day })
        .status,
    ).not.toBe(0)
  })
})
