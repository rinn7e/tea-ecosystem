import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { type ScriptRepo, json, scriptRepo } from '../helper/script-repo'

// `scripts/settle-pull-request.sh`: settles by its number a pull request of
// the weekly search that was opened before, with the checks and the rules
// of a run

const day = '2026-11-16'
const runBranch = `discover/${day}-6`
const elm = { id: 'elm', repo: 'https://github.com/elm/compiler' }

const repo: { at: ScriptRepo | undefined } = { at: undefined }

const current = (): ScriptRepo => {
  if (repo.at === undefined) {
    throw new Error('no repository')
  } else {
    return repo.at
  }
}

const entryOf = (id: string, stars: number) => ({
  id,
  repo: `https://github.com/o/${id}`,
  discoveredAt: `${day}T06:02:11Z`,
  status: 'active',
  stars,
  updatedAt: '2026-10-01',
  verified: true,
  snippetSource: `https://github.com/o/${id}/blob/main/README.md`,
})

// The branch of the pull request on GitHub, adding `entry` with its
// example, and the master of the checkout left as it was; its head
const branchOf = (entry: Record<string, unknown>): string => {
  const at = current()
  at.git('switch', '-q', '-c', runBranch, 'base')
  writeFileSync(path.join(at.dir, 'data/frameworks.json'), json([elm, entry]))
  writeFileSync(
    path.join(at.dir, `data/snippet/${String(entry.id)}.rs`),
    'fn main() {}\n',
  )
  at.git('add', '-A')
  at.git('commit', '-q', '-m', 'Add the entries the weekly search found')
  at.remoteGit('fetch', '-q', at.dir, `${runBranch}:${runBranch}`)
  const head = at.git('rev-parse', 'HEAD').trim()
  at.git('switch', '-q', 'master')
  at.git('branch', '-q', '-D', runBranch)
  return head
}

const viewOf = (head: string, change: Record<string, unknown> = {}) => ({
  url: 'https://github.com/owner/name/pull/16',
  state: 'OPEN',
  isCrossRepository: false,
  headRefName: runBranch,
  headRefOid: head,
  ...change,
})

const settle = (number: string, view: Record<string, unknown>) =>
  current().run(
    'settle-pull-request.sh',
    [number],
    {},
    {
      pullRequestView: view,
    },
  )

beforeEach(() => {
  repo.at = scriptRepo([elm], [])
})

afterEach(() => {
  current().remove()
})

describe('settle-pull-request.sh', { timeout: 30_000 }, () => {
  it('merges a pull request whose candidates pass every rule, after the checks', () => {
    const head = branchOf(entryOf('good-tea', 120))
    const master = current().git('rev-parse', 'master').trim()
    const { status, out, log } = settle('16', viewOf(head))
    expect(status).toBe(0)
    expect(log).toContain('pnpm run test token=unset')
    // Back on `master` after the checks, whose scripts the rules run from
    expect(current().git('rev-parse', 'HEAD').trim()).toBe(master)
    expect(log).toContain(
      'gh pr merge https://github.com/owner/name/pull/16 --merge --delete-branch',
    )
    expect(log).toContain('gh workflow run pages.yml --ref master')
    expect(out).toContain('Merged it: every candidate passed the rules.')
  })

  it('comments on a pull request whose candidates break a rule, and merges nothing', () => {
    const head = branchOf(entryOf('small-tea', 2))
    const { status, log } = settle('16', viewOf(head))
    expect(status).toBe(0)
    expect(log).toContain('small-tea: 2 stars (at least 5)')
    expect(log).not.toContain('pr merge')
  })

  it('leaves a pull request whose data fails the checks as it is', () => {
    const head = branchOf({ ...entryOf('failing', 120) })
    const { status, out, log } = settle('16', viewOf(head))
    expect(status).toBe(1)
    expect(out).toContain(
      '::error::pull request 16 is left as it is: pnpm run test fails',
    )
    expect(log).not.toContain('pr merge')
    expect(log).not.toContain('pr comment')
  })

  it('says so when the branch shares no commit with master', () => {
    const at = current()
    at.git('switch', '-q', '--orphan', runBranch)
    writeFileSync(path.join(at.dir, 'data/frameworks.json'), json([elm]))
    at.git('add', '-A')
    at.git('commit', '-q', '-m', 'Another history')
    at.remoteGit('fetch', '-q', at.dir, `${runBranch}:${runBranch}`)
    const head = at.git('rev-parse', 'HEAD').trim()
    at.git('switch', '-q', '-f', 'master')
    const { status, out } = settle('16', viewOf(head))
    expect(status).toBe(1)
    expect(out).toContain('shares no commit with master')
  })

  it.each<[string, string, Record<string, unknown>, string]>([
    [
      'a number that is not one',
      '16; rm -rf /',
      {},
      'is not the number of a pull request',
    ],
    ['a closed pull request', '16', { state: 'MERGED' }, 'is MERGED, not open'],
    [
      'a pull request from a fork',
      '16',
      { isCrossRepository: true },
      'comes from a fork',
    ],
    [
      'a branch that is not of the search',
      '16',
      { headRefName: 'rinn7e/other-work' },
      'is not from a branch of the search',
    ],
    [
      'a head that moved since it was read',
      '16',
      { headRefOid: '0000000000000000000000000000000000000000' },
      'moved while it was read',
    ],
  ])('refuses %s', (_, number, change, said) => {
    const head = branchOf(entryOf('good-tea', 120))
    const { status, out, log } = settle(number, viewOf(head, change))
    expect(status).toBe(1)
    expect(out).toContain(said)
    expect(log).not.toContain('pr merge')
    expect(log).not.toContain('pr comment')
  })
})
