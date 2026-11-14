import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { type ScriptRepo, scriptRepo } from '../helper/script-repo'

// `scripts/bundle-discovered.sh`: the branch of the run handed from the
// search job to the propose job

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

const bundle = () => {
  const at = current()
  const output = path.join(at.dir, 'github-output')
  const file = path.join(at.dir, 'discover.bundle')
  const result = at.run('bundle-discovered.sh', [file], {
    BASE: 'base',
    DAY: day,
    GITHUB_OUTPUT: output,
  })
  return {
    ...result,
    found:
      existsSync(output) && readFileSync(output, 'utf8').includes('found=true'),
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
})
