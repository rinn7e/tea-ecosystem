import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  type Answers,
  type ScriptRepo,
  json,
  pullRequestOf,
  scriptRepo,
} from '../helper/script-repo'

// `scripts/propose-discovered.sh`: the draft pull request of a run, made of
// a fresh commit of the data the agent left, after the gate, the checks of
// the data and the checks of the repository

const day = '2026-11-16'
const runBranch = `discover/${day}`
const elm = { id: 'elm', repo: 'https://github.com/elm/compiler' }

const repo: { at: ScriptRepo | undefined } = { at: undefined }

const current = (): ScriptRepo => {
  if (repo.at === undefined) {
    throw new Error('no repository')
  } else {
    return repo.at
  }
}

const entryOf = (id: string) => ({
  id,
  repo: `https://github.com/o/${id}`,
  discoveredAt: `${day}T06:02:11Z`,
  notes: [`Found by @someone, Fixes #2, see o/r#1.`],
})

// The branch of the run with one commit per id of `ids`, each with the
// message `message`, which never leaves the run
const candidates = (
  ids: string[],
  message = 'Thanks @someone, Fixes #2',
): void => {
  const at = current()
  at.git('switch', '-q', '-c', runBranch, 'base')
  ids.forEach((id, i) => {
    writeFileSync(
      path.join(at.dir, 'data/frameworks.json'),
      json([elm, ...ids.slice(0, i + 1).map(entryOf)]),
    )
    at.git('commit', '-q', '-a', '-m', message)
  })
  at.git('switch', '-q', '--detach', 'base')
}

const propose = (answers: Answers = {}, env: Record<string, string> = {}) =>
  current().run(
    'propose-discovered.sh',
    [],
    { BASE: 'base', DAY: day, ...env },
    answers,
  )

// The commit of the branch on GitHub, with its message and author
const pushed = (format: string): string =>
  current().remoteGit('log', '-1', `--format=${format}`, runBranch).trim()

beforeEach(() => {
  repo.at = scriptRepo([elm], [])
})

afterEach(() => {
  current().remove()
})

// Each test runs the script on real git repositories, the checks and the
// rules of a merge included, which takes seconds under a full suite
describe('propose-discovered.sh', { timeout: 30_000 }, () => {
  it('pushes a fresh commit of the data and opens one draft pull request, the entries as code', () => {
    candidates(['good-tea', 'other-tea'])
    const { status, out, log } = propose({}, { GITHUB_RUN_ID: '42' })
    expect(status).toBe(0)
    expect(log).toContain('pnpm run format:check token=unset')
    expect(log).toContain('pnpm run test token=unset')
    expect(log).toMatch(
      new RegExp(
        `push --quiet https://x-access-token:<token>@github.com/owner/name.git [0-9a-f]{40}:refs/heads/${runBranch}`,
      ),
    )
    expect(log).toContain(
      `pr create --draft --base master --head ${runBranch} --title Add the entries the weekly search found on ${day} --body-file -`,
    )
    expect(log).toContain(
      'is in the summary of the run: https://github.com/owner/name/actions/runs/42',
    )
    expect(log).toContain(
      ['## good-tea', '', '```json', '{', '  "id": "good-tea",'].join('\n'),
    )
    expect(log).toContain('## other-tea')
    expect(log).toContain('To turn one down, remove its entry')
    expect(out).toContain(
      'Proposed 2 candidates in one pull request: https://github.com/owner/name/pull/17',
    )
  })

  it('leaves a run whose candidates break a rule as a draft, with a comment that names the rules', () => {
    candidates(['good-tea'])
    const { status, out, log } = propose()
    expect(status).toBe(0)
    expect(log).toContain(
      'pr comment https://github.com/owner/name/pull/17 --body-file -',
    )
    expect(log).toContain('good-tea: 0 stars (at least 50)')
    expect(log).toContain('good-tea: no example')
    expect(log).not.toContain('gh pr ready')
    expect(log).not.toContain('gh pr merge')
    expect(out).toMatch(/Left it for a person: \d+ rules failed\./)
  })

  it('merges a run whose candidates pass every rule, then starts the deploy', () => {
    const at = current()
    at.git('switch', '-q', '-c', runBranch, 'base')
    writeFileSync(
      path.join(at.dir, 'data/frameworks.json'),
      json([
        elm,
        {
          ...entryOf('good-tea'),
          status: 'active',
          stars: 120,
          updatedAt: '2026-10-01',
          verified: true,
          snippetSource: 'https://github.com/o/good-tea/blob/main/README.md',
        },
      ]),
    )
    writeFileSync(
      path.join(at.dir, 'data/snippet/good-tea.rs'),
      'fn main() {}\n',
    )
    at.git('add', '-A')
    at.git('commit', '-q', '-m', 'Add good-tea')
    at.git('switch', '-q', '--detach', 'base')
    const { status, out, log } = propose()
    expect(status).toBe(0)
    const ready = log.indexOf(
      'gh pr ready https://github.com/owner/name/pull/17',
    )
    const merge = log.indexOf(
      'gh pr merge https://github.com/owner/name/pull/17 --merge --delete-branch',
    )
    const deploy = log.indexOf('gh workflow run pages.yml --ref master')
    expect([ready > -1, merge > ready, deploy > merge]).toEqual([
      true,
      true,
      true,
    ])
    expect(log).not.toContain('pr comment')
    expect(out).toContain('Merged it: every candidate passed the rules.')
  })

  it('never pushes a commit of the agent: its message, its author and its states in between', () => {
    candidates(['good-tea', 'other-tea'])
    propose()
    expect(pushed('%s%n%n%b')).toBe(
      `Add the entries the weekly search found on ${day}\n\nEntries: good-tea, other-tea.`,
    )
    expect(pushed('%an <%ae> %aI')).toBe(
      `github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com> ${day}T00:00:00Z`,
    )
    // One commit, on top of the base
    expect(current().remoteGit('rev-parse', `${runBranch}^`).trim()).toBe(
      current().git('rev-parse', 'base').trim(),
    )
    expect(
      current().remoteGit('show', '--format=', '--name-only', runBranch),
    ).toBe('data/frameworks.json\n')
  })

  it('makes the same commit on every try of a run', () => {
    candidates(['good-tea'])
    propose()
    const first = pushed('%H')
    current().remoteGit('update-ref', '-d', `refs/heads/${runBranch}`)
    propose()
    expect(pushed('%H')).toBe(first)
  })

  it('finishes a try that pushed and failed to open its pull request, from GitHub alone', () => {
    candidates(['good-tea'])
    const failed = propose({ failCreate: true })
    expect(failed.status).not.toBe(0)
    // The next try has no branch of the search job, only what is on GitHub
    current().git('branch', '-q', '-D', runBranch)
    const { status, out, log } = propose()
    expect(status).toBe(0)
    expect(log).toContain(
      `fetch --quiet https://x-access-token:<token>@github.com/owner/name.git refs/heads/${runBranch}`,
    )
    expect(log).not.toContain('push --quiet')
    expect(log).toContain(`pr create --draft --base master --head ${runBranch}`)
    expect(log).toContain('## good-tea')
    expect(out).toContain('Proposed 1 candidates in one pull request: ')
  })

  it('refuses a branch on GitHub at another commit than it says', () => {
    candidates(['good-tea'])
    propose({ failCreate: true })
    const { status, out, log } = propose({
      onGitHub: { [runBranch]: '0000000000000000000000000000000000000000' },
    })
    expect(status).toBe(1)
    expect(out).toContain(
      `::error::${runBranch} on GitHub is not one commit of the search`,
    )
    expect(log).not.toContain('pr create')
  })

  it('breaks up a run of three backticks in an entry, so it cannot end its block', () => {
    const at = current()
    at.git('switch', '-q', '-c', runBranch, 'base')
    writeFileSync(
      path.join(at.dir, 'data/frameworks.json'),
      json([elm, { ...entryOf('good-tea'), notes: ['a\n```\n@someone'] }]),
    )
    at.git('commit', '-q', '-a', '-m', 'Add')
    at.git('switch', '-q', '--detach', 'base')
    const { log } = propose()
    expect(log).not.toMatch(/^```\n@someone/m)
  })

  it.each<[string, Answers, string]>([
    [
      'an earlier pull request of the search is open',
      {
        pullRequests: [pullRequestOf('discover/2026-11-09', { state: 'OPEN' })],
      },
      'an earlier pull request of the search is still open',
    ],
    [
      'the branch already had a pull request',
      { pullRequests: [pullRequestOf(runBranch)] },
      `a pull request was already opened from ${runBranch}`,
    ],
  ])('skips the run when %s', (_, answers, said) => {
    candidates(['good-tea'])
    const { status, out, log } = propose(answers)
    expect(status).toBe(0)
    expect(out).toContain(`::warning::${runBranch} is skipped: ${said}`)
    expect(log).not.toContain('push')
    expect(log).not.toContain('pnpm')
  })

  it.each<[string, string, string]>([
    ['its data', 'x|.', 'its new entries need an id of lowercase words'],
    ['its tests', 'failing', 'pnpm run test fails'],
    ['its format', 'unformatted', 'pnpm run format:check fails'],
  ])(
    'leaves out a branch that fails the checks of %s, and fails the run',
    (_, id, said) => {
      candidates([id])
      const { status, out, log } = propose()
      expect(status).toBe(1)
      expect(out).toContain(`::error::${runBranch} is left out: ${said}`)
      expect(log).not.toContain('push')
      expect(log).not.toContain('pr create')
    },
  )

  it('counts checks that fail to run as a problem, never as a pass', () => {
    candidates(['good-tea'])
    const { status, out, log } = propose({ crashJqOn: '.kept' })
    expect(status).toBe(1)
    expect(out).toContain(
      `::error::${runBranch} is left out: its checks failed to run`,
    )
    expect(log).not.toContain('push')
  })

  it('counts checks that fail to run as a problem when it finishes an earlier try too', () => {
    candidates(['good-tea'])
    propose({ failCreate: true })
    const { status, out, log } = propose({ crashJqOn: '.kept' })
    expect(status).toBe(1)
    expect(out).toContain(
      `::error::${runBranch} is left out: its checks failed to run`,
    )
    expect(log).not.toContain('pr create')
  })

  it('turns the workflow commands of GitHub off around the output of the checks', () => {
    candidates(['good-tea'])
    const { err } = propose()
    const marker = /::stop-commands::(stop-[^\n]+)\n/.exec(err)?.[1] ?? ''
    expect(marker).not.toBe('')
    const inside = err.slice(
      err.indexOf(`::stop-commands::${marker}`),
      err.indexOf(`::${marker}::`),
    )
    expect(inside).toContain('::warning::from the checks')
    expect(err.indexOf(`::${marker}::`)).toBeGreaterThan(
      err.lastIndexOf('::warning::from the checks'),
    )
  })

  it.each<[string, Answers]>([
    ['gh pr list', { failPullRequests: true }],
    ['git ls-remote', { failLsRemote: true }],
  ])('stops at the gate, and proposes nothing, when %s fails', (_, answers) => {
    candidates(['closed-tea'])
    const { status, out, log } = propose(answers)
    expect(status).not.toBe(0)
    expect(out).not.toContain('is left out')
    expect(log).not.toContain('pnpm')
    expect(log).not.toContain('push --quiet')
    expect(log).not.toContain('pr create')
  })

  it('fails the run when the branch of the run is missing', () => {
    const { status, out } = propose()
    expect(status).toBe(1)
    expect(out).toContain(`::error::there is no branch ${runBranch} to propose`)
  })
})
