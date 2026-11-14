import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { type ScriptRepo, scriptRepo } from '../helper/script-repo'

// `scripts/bundle-discovered.sh`: the branch of the run handed from the
// search job to the propose job

const day = '2026-11-16'
const runBranch = `discover/${day}`
// The secrets of the job; `scriptRepo` sets `GH_TOKEN` itself
const key = 'sk-ant-test-not-a-key'
const token = 'secret-token'

const repo: { at: ScriptRepo | undefined } = { at: undefined }

const current = (): ScriptRepo => {
  if (repo.at === undefined) {
    throw new Error('no repository')
  } else {
    return repo.at
  }
}

// A branch with `count` commits on top of the base
const branchOf = (branch: string, count: number): void => {
  const at = current()
  at.git('switch', '-q', '-c', branch, 'base')
  mkdirSync(path.join(at.dir, 'data/snippet'), { recursive: true })
  Array.from({ length: count }, (_, i) => i).forEach((i) => {
    writeFileSync(path.join(at.dir, 'data/snippet', `x${i}.rs`), `${i}\n`)
    at.git('add', '-A')
    at.git('commit', '-q', '-m', `Commit ${i}`)
  })
  at.git('switch', '-q', '--detach', 'base')
}

// One more commit on a branch, made by `make` in the work tree
const commitOn = (
  branch: string,
  make: (at: ScriptRepo) => void,
  args: string[] = ['-m', 'Add x'],
): void => {
  const at = current()
  at.git('switch', '-q', branch)
  make(at)
  at.git('add', '-A')
  at.git('commit', '-q', '--allow-empty', ...args)
  at.git('switch', '-q', '--detach', 'base')
}

const snippet =
  (name: string, content: string) =>
  (at: ScriptRepo): void =>
    writeFileSync(path.join(at.dir, 'data/snippet', name), content)

const bundle = (env: Record<string, string> = { ANTHROPIC_API_KEY: key }) => {
  const at = current()
  const output = path.join(at.dir, 'github-output')
  const file = path.join(at.dir, 'discover.bundle')
  const result = at.run('bundle-discovered.sh', [file], {
    BASE: 'base',
    DAY: day,
    GITHUB_OUTPUT: output,
    ...env,
  })
  return {
    ...result,
    found:
      existsSync(output) && readFileSync(output, 'utf8').includes('found=true'),
    written: existsSync(file),
    bundled: (): string =>
      existsSync(file) ? at.git('bundle', 'list-heads', file) : '',
  }
}

beforeEach(() => {
  repo.at = scriptRepo([{ id: 'elm' }], [])
})

afterEach(() => {
  current().remove()
})

describe('bundle-discovered.sh', () => {
  it('bundles the branch of the run when it has a commit', () => {
    branchOf(runBranch, 2)
    const { status, found, bundled } = bundle()
    expect(status).toBe(0)
    expect(found).toBe(true)
    expect(bundled()).toContain(`refs/heads/${runBranch}`)
  })

  it.each<[string, () => void]>([
    ['no branch', () => undefined],
    ['a branch with no commit', () => branchOf(runBranch, 0)],
  ])('finds no candidate with %s', (_, make) => {
    make()
    const { status, out, found } = bundle()
    expect(status).toBe(0)
    expect(found).toBe(false)
    expect(out).toContain('No candidates this run.')
  })

  it('names any other branch under discover/, leaves it out, and fails the step', () => {
    branchOf(runBranch, 1)
    branchOf('discover/other', 1)
    const { status, out, found, bundled } = bundle()
    expect(status).toBe(1)
    expect(out).toContain(
      `::error::discover/other is left out: a run proposes only its own branch, ${runBranch}`,
    )
    expect(found).toBe(true)
    expect(bundled()).not.toContain('discover/other')
  })

  // A hijacked agent can copy the key into a commit message (typed, or
  // from a file it wrote) or into a file it may write; anything on the
  // branch is in the bundle, which any signed-in GitHub user can download
  it.each<[string, string, () => void]>([
    [
      'a commit message',
      'ANTHROPIC_API_KEY',
      () =>
        commitOn(runBranch, () => undefined, [
          '-m',
          `Add x\n\nANTHROPIC_API_KEY=${key}\nHOME=/home/runner`,
        ]),
    ],
    [
      'a file of data/snippet/',
      'ANTHROPIC_API_KEY',
      () => commitOn(runBranch, snippet('x.rs', `// ${key}\n`)),
    ],
    [
      'a file that a later commit removes',
      'ANTHROPIC_API_KEY',
      () => {
        commitOn(runBranch, snippet('gone.rs', `${key}\n`))
        commitOn(runBranch, (at) => at.git('rm', '-q', 'data/snippet/gone.rs'))
      },
    ],
    [
      'the name of a file',
      'ANTHROPIC_API_KEY',
      () => commitOn(runBranch, snippet(`${key}.rs`, 'x\n')),
    ],
    [
      'the author of a commit',
      'ANTHROPIC_API_KEY',
      () =>
        commitOn(runBranch, () => undefined, [
          '-m',
          'Add x',
          `--author=${key} <x@example.invalid>`,
        ]),
    ],
    [
      'a commit message, with the token',
      'GH_TOKEN',
      () => commitOn(runBranch, () => undefined, ['-m', `Add x ${token}`]),
    ],
  ])(
    'refuses to bundle a branch with a secret in %s, and fails the step',
    (_, name, leak) => {
      branchOf(runBranch, 1)
      leak()
      const { status, out, found, written } = bundle()
      expect(status).toBe(1)
      expect(out).toContain(
        `::error::The branch ${runBranch} holds the value of ${name}, so it stays out of the artifacts`,
      )
      expect(out).not.toContain(key)
      expect(out).not.toContain(token)
      expect(found).toBe(false)
      expect(written).toBe(false)
    },
  )

  it('bundles a branch whose base holds a secret, as the bundle leaves the base out', () => {
    current().git('switch', '-q', '-c', 'with-key', 'base')
    commitOn('with-key', snippet('old.rs', `${key}\n`))
    current().git('tag', '-f', 'base', 'with-key')
    branchOf(runBranch, 1)
    const { status, found, bundled } = bundle()
    expect(status).toBe(0)
    expect(found).toBe(true)
    expect(bundled()).toContain(`refs/heads/${runBranch}`)
  })

  it('refuses to bundle when the step does not set the key, so nothing goes out unchecked', () => {
    branchOf(runBranch, 1)
    const { status, out, found, written } = bundle({})
    expect(status).toBe(1)
    expect(out).toContain(
      `::error::The branch ${runBranch} is not checked for secrets: the step does not set ANTHROPIC_API_KEY, so it stays out of the artifacts`,
    )
    expect(found).toBe(false)
    expect(written).toBe(false)
  })
})
