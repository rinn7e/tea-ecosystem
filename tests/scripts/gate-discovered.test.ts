import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  type Answers,
  type ScriptRepo,
  pullRequestOf,
  scriptRepo,
} from '../helper/script-repo'

// `scripts/gate-discovered.sh`: whether a run of the weekly search may
// propose, from the pull requests and branches of the repository

const day = '2026-11-16'
const runBranch = `discover/${day}`

const repo: { at: ScriptRepo | undefined } = { at: undefined }

const current = (): ScriptRepo => {
  if (repo.at === undefined) {
    throw new Error('no repository')
  } else {
    return repo.at
  }
}

const gate = (answers: Answers = {}, env: Record<string, string> = {}) => {
  const result = current().run(
    'gate-discovered.sh',
    ['proposed.json'],
    { DAY: day, ...env },
    answers,
  )
  return {
    ...result,
    proposed: (): unknown =>
      JSON.parse(
        readFileSync(path.join(current().dir, 'proposed.json'), 'utf8'),
      ),
  }
}

beforeEach(() => {
  repo.at = scriptRepo([{ id: 'elm' }], [])
})

afterEach(() => {
  current().remove()
})

describe('gate-discovered.sh', () => {
  it('lets a run propose when nothing of the search is open or proposed today', () => {
    const { status, out } = gate({
      pullRequests: [
        pullRequestOf('discover/2026-11-09', { state: 'MERGED' }),
        pullRequestOf('rinn7e/7-other-work', { state: 'OPEN' }),
      ],
    })
    expect(status).toBe(0)
    expect(out).toBe('go\n')
  })

  it('skips the run while an earlier pull request of the search is open', () => {
    const { out } = gate({
      pullRequests: [pullRequestOf('discover/2026-11-09', { state: 'OPEN' })],
    })
    expect(out).toBe(
      'skip: an earlier pull request of the search is still open\n',
    )
  })

  it.each(['CLOSED', 'MERGED'] as const)(
    'skips a run of a day whose pull request was %s',
    (state) => {
      const { out } = gate({
        pullRequests: [pullRequestOf(runBranch, { state })],
      })
      expect(out).toBe(
        `skip: a pull request was already opened from ${runBranch}\n`,
      )
    },
  )

  it('lets a run started by hand search on a day that already proposed, but not while a pull request is open', () => {
    const manual = { BRANCH: `${runBranch}-7` }
    const merged = pullRequestOf(runBranch, { state: 'MERGED' })
    expect(gate({ pullRequests: [merged] }, manual).out).toBe('go\n')
    expect(
      gate(
        {
          pullRequests: [
            merged,
            pullRequestOf(`${runBranch}-7`, { state: 'CLOSED' }),
          ],
        },
        manual,
      ).out,
    ).toBe(`skip: a pull request was already opened from ${runBranch}-7\n`)
    expect(
      gate(
        { pullRequests: [pullRequestOf(runBranch, { state: 'OPEN' })] },
        manual,
      ).out,
    ).toBe('skip: an earlier pull request of the search is still open\n')
  })

  it('says when the branch of the day is on GitHub with no pull request, and at which commit', () => {
    const { out, log } = gate({ onGitHub: { [runBranch]: 'abc1234' } })
    expect(out).toBe('pushed abc1234\n')
    expect(log).toContain(
      `ls-remote --heads https://x-access-token:<token>@github.com/owner/name.git refs/heads/${runBranch}`,
    )
  })

  it('skips, rather than resumes, a day whose pull request was opened while its branch is still on GitHub', () => {
    const { out } = gate({
      pullRequests: [pullRequestOf(runBranch, { state: 'OPEN' })],
      onGitHub: { [runBranch]: 'abc1234' },
    })
    expect(out).toMatch(/^skip: /)
  })

  it('counts no pull request from a fork, whatever its branch is called', () => {
    const fork = { isCrossRepository: true, state: 'OPEN' } as const
    const { out, proposed } = gate({
      pullRequests: [
        pullRequestOf('discover/x', fork),
        pullRequestOf(runBranch, fork),
      ],
    })
    expect(out).toBe('go\n')
    expect(proposed()).toEqual([])
  })

  it('writes the pull requests of the search for the agent, and only them', () => {
    const own = pullRequestOf('discover/2026-11-09', { state: 'MERGED' })
    const { proposed } = gate({
      pullRequests: [own, pullRequestOf('rinn7e/7-other-work')],
    })
    expect(proposed()).toEqual([own])
  })

  it.each<[string, Answers]>([
    ['gh pr list', { failPullRequests: true }],
    ['git ls-remote', { failLsRemote: true }],
  ])('stops, and says nothing, when %s fails', (_, answers) => {
    const { status, out } = gate(answers)
    expect(status).not.toBe(0)
    expect(out).toBe('')
  })
})
