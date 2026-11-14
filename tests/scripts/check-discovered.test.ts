import { fc, test } from '@fast-check/vitest'
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { type ScriptRepo, json, scriptRepo } from '../helper/script-repo'

// `scripts/check-discovered.sh` on what a run of the weekly search may
// hand to the job that opens its pull request, and what it may not: only
// the final data of the branch counts

const day = '2026-11-16'
const runBranch = `discover/${day}`

type Entry = { id: string; repo: string; discoveredAt: string }

const entryOf = (id: string): Entry => ({
  id,
  repo: `https://github.com/o/${id}`,
  discoveredAt: day,
})

const elm: Entry = { ...entryOf('elm'), discoveredAt: '2026-11-13' }
const lustre: Entry = { ...entryOf('lustre'), discoveredAt: '2026-11-13' }
const base: Entry[] = [elm, lustre]
const baseAdjacent: Entry[] = [
  { ...entryOf('redux'), discoveredAt: '2026-11-13' },
]

const repo: { at: ScriptRepo | undefined } = { at: undefined }

const current = (): ScriptRepo => {
  if (repo.at === undefined) {
    throw new Error('no repository')
  } else {
    return repo.at
  }
}

const write = (file: string, content: string): void => {
  const target = path.join(current().dir, file)
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, content)
}

// The frameworks of the branch: those of the base and `added`
const setEntries = (...added: Entry[]): void =>
  write('data/frameworks.json', json([...base, ...added]))

const commit = (message = 'Add an entry'): void => {
  current().git('add', '-A')
  current().git('commit', '-q', '--allow-empty', '-m', message)
}

// What the script says of the tip of the branch, with at most 3 entries
const problem = (max = '3'): string =>
  current()
    .run('check-discovered.sh', ['base', runBranch, max, day], {})
    .out.trim()

const newTea = entryOf('new-tea')

// The branch adding the entry `new-tea`, with `change` on top
const newTeaWith = (change: () => void): void => {
  setEntries(newTea)
  change()
  commit()
}

beforeEach(() => {
  repo.at = scriptRepo(base, baseAdjacent, {
    'data/snippet/elm.elm': 'main = text "hi"\n',
    'vite.config.ts': 'export default {}\n',
  })
  current().git('switch', '-q', '-c', runBranch)
})

afterEach(() => {
  current().remove()
})

describe('check-discovered.sh', () => {
  it('passes new entries of both files with their examples, however they were committed', () => {
    setEntries(newTea)
    commit('Thanks @someone, Fixes #2')
    write('data/snippet/new-tea.rs', 'fn main() {}\n')
    const store = entryOf('new-store')
    write('data/adjacent.json', json([...baseAdjacent, store]))
    commit()
    expect(problem()).toBe('')
  })

  it('passes a new entry dated with a time in UTC of the day of the run', () => {
    setEntries({ ...newTea, discoveredAt: `${day}T06:02:11Z` })
    commit()
    expect(problem()).toBe('')
  })

  it('passes as many entries as a run may propose, and no more', () => {
    setEntries(...['one', 'two', 'three'].map(entryOf))
    commit()
    expect(problem()).toBe('')
    expect(problem('2')).toBe('it adds 3 entries, not 1 to 2')
  })

  it('refuses a branch that adds no entry', () => {
    expect(problem()).toBe('it adds 0 entries, not 1 to 3')
  })

  it('looks only at the final data, not at what a commit in between held', () => {
    newTeaWith(() => write('vite.config.ts', 'export default { evil: true }\n'))
    write('vite.config.ts', 'export default {}\n')
    commit('Undo')
    expect(problem()).toBe('')
  })

  it('refuses data that does not read as JSON', () => {
    newTeaWith(() => write('data/adjacent.json', '[{'))
    expect(problem()).toBe('its data files do not read as JSON')
  })

  it.each<[string, Entry[], Entry[]]>([
    [
      'changes',
      [{ ...elm, repo: 'https://github.com/o/changed' }, lustre],
      baseAdjacent,
    ],
    ['removes', [elm], baseAdjacent],
    ['moves', [lustre, elm], baseAdjacent],
    ['moves to the other file', base, [...baseAdjacent, elm]],
  ])('refuses data that %s an existing entry', (_, frameworks, adjacent) => {
    write('data/frameworks.json', json([...frameworks, newTea]))
    write('data/adjacent.json', json(adjacent))
    commit()
    expect(problem()).toBe('it changes, moves or removes existing entries')
  })

  test.prop(
    [
      fc
        .string({ minLength: 1, maxLength: 12 })
        .filter((id) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)),
    ],
    { numRuns: 10 },
  )(
    'refuses an id that is not lowercase words, before it reaches a pattern',
    (id) => {
      current().git('reset', '-q', '--hard', 'base')
      setEntries({ ...newTea, id })
      // With `x|.` as its id, the pattern of allowed files would match
      // this file too
      write('vite.config.ts', 'export default { evil: true }\n')
      commit()
      expect(problem()).toMatch(
        /^its new entries need an id of lowercase words/,
      )
    },
    // A commit and a run of the script for each value
    30_000,
  )

  it.each<[string, Partial<Entry>]>([
    ['the id x|.', { id: 'x|.' }],
    ['the id -x', { id: '-x' }],
    ['the id a--b', { id: 'a--b' }],
    ['an id with a line break at its end', { id: 'a\n' }],
    ['another discoveredAt', { discoveredAt: '2026-11-15' }],
    ['a time of another day', { discoveredAt: '2026-11-15T06:00:00Z' }],
    ['a time with no zone', { discoveredAt: `${day}T06:00:00` }],
    [
      'a time after the day and a line break',
      { discoveredAt: `${day}\nT06:00:00Z` },
    ],
    ['a repo that is not https', { repo: 'http://github.com/o/new-tea' }],
    ['a repo of two lines', { repo: 'https://github.com/o/a\n::warning::x' }],
  ])('refuses a new entry with %s', (_, change) => {
    setEntries({ ...newTea, ...change })
    commit()
    expect(problem()).toMatch(/^its new entries need an id of lowercase words/)
  })

  it.each<[string, () => void]>([
    ['M vite.config.ts', () => write('vite.config.ts', 'export {}\n')],
    [
      'A tests/evil.test.ts',
      () => write('tests/evil.test.ts', 'throw new Error()\n'),
    ],
    [
      'M data/snippet/elm.elm',
      () => write('data/snippet/elm.elm', 'main = text "changed"\n'),
    ],
    [
      'A data/snippet/other.rs',
      () => write('data/snippet/other.rs', 'fn main() {}\n'),
    ],
    // A rename shows as the file it removes
    [
      'D vite.config.ts',
      () => current().git('mv', 'vite.config.ts', 'data/snippet/new-tea.ts'),
    ],
  ])(
    'refuses any file but the data files and the examples of its entries: %s',
    (shown, change) => {
      newTeaWith(change)
      expect(problem()).toContain(
        `it changes files outside the data of its entries: ${shown}`,
      )
    },
  )

  it('refuses a second example for one entry', () => {
    newTeaWith(() => {
      write('data/snippet/new-tea.rs', 'fn main() {}\n')
      write('data/snippet/new-tea.ts', 'main()\n')
    })
    expect(problem()).toBe('it adds more than one example for: new-tea')
  })

  it('refuses an example that is a link, not a plain file', () => {
    newTeaWith(() =>
      symlinkSync(
        '/etc/hosts',
        path.join(current().dir, 'data/snippet/new-tea.rs'),
      ),
    )
    expect(problem()).toBe(
      'it adds a file that is not a plain file (mode 100644 120000 )',
    )
  })

  it('stops, and says nothing, when a command it reads with fails', () => {
    newTeaWith(() => undefined)
    const { status, out } = current().run(
      'check-discovered.sh',
      ['base', runBranch, '3', day],
      {},
      { crashJqOn: '.kept' },
    )
    expect(status).not.toBe(0)
    expect(out).toBe('')
  })
})
