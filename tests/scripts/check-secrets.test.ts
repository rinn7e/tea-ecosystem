import { fc, test } from '@fast-check/vitest'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

import {
  REQUIRED_NAMES,
  SECRET_NAMES,
  errorsOf,
  secretNamesIn,
  secretsOf,
} from '../../scripts/check-secrets.mjs'
import { scriptOf } from '../helper/script-repo'

// `scripts/check-secrets.mjs`: the check before each upload of the search
// job, the transcript of the agent and the bundle of its branch
// (`tests/scripts/bundle-discovered.test.ts` checks the bundle)

const key = 'sk-ant-test-not-a-key'
const token = 'ghs_test-not-a-token'
const env = { ANTHROPIC_API_KEY: key, GH_TOKEN: token, HOME: '/home/runner' }

// A secret, as long as a real one may be, and an environment that holds it
// under one of the names
const secretArb = fc.string({ minLength: 8 })
const named = fc.constantFrom(...SECRET_NAMES)

// The step of the transcript in the workflow: the file on stdin
const check = (input: string, stepEnv: Record<string, string | undefined>) =>
  spawnSync(
    process.execPath,
    [scriptOf('check-secrets.mjs'), 'The transcript of the agent'],
    {
      input,
      encoding: 'utf8',
      env: { PATH: process.env.PATH, ...stepEnv },
    },
  )

describe('the check of the secrets before an upload', () => {
  test.prop([named, secretArb, fc.string(), fc.string()])(
    'find a secret wherever it is in the data, as text or as bytes',
    (name, secret, start, end) => {
      const data = `${start}${secret}${end}`
      expect(secretNamesIn({ [name]: secret })(data)).toEqual([name])
      expect(secretNamesIn({ [name]: secret })(Buffer.from(data))).toEqual([
        name,
      ])
    },
  )

  test.prop([named, secretArb, fc.string()])(
    'find no secret in data that does not hold it',
    (name, secret, data) => {
      fc.pre(!data.includes(secret))
      expect(secretNamesIn({ [name]: secret })(data)).toEqual([])
    },
  )

  it('leave out a value too short to be a key, as the redaction does', () => {
    const short = {
      ANTHROPIC_API_KEY: '1234567',
      GH_TOKEN: '12345678',
      GITHUB_TOKEN: '1234567',
      HOME: '/home/runner',
    }
    expect(secretNamesIn(short)('1234567 12345678')).toEqual(['GH_TOKEN'])
    expect(secretsOf(short)).toEqual(['12345678'])
    expect(secretsOf({ ...short, ANTHROPIC_API_KEY: key })).toEqual([
      key,
      '12345678',
    ])
  })

  it('name each secret found, never its value', () => {
    const errors = errorsOf(env)('The transcript', `a ${token} b ${key} c`)
    expect(errors).toEqual([
      '::error::The transcript holds the value of ANTHROPIC_API_KEY, so it stays out of the artifacts',
      '::error::The transcript holds the value of GH_TOKEN, so it stays out of the artifacts',
    ])
    expect(errors.join('\n')).not.toContain(key)
    expect(errors.join('\n')).not.toContain(token)
  })

  test.prop([fc.subarray(REQUIRED_NAMES, { minLength: 1 }), fc.string()])(
    'fail when the step leaves out a secret the job holds, whatever the data',
    (unset, data) => {
      const stepEnv = Object.fromEntries(
        Object.entries(env).filter(([name]) => !unset.includes(name)),
      )
      expect(errorsOf(stepEnv)('The transcript', data)).toContain(
        `::error::The transcript is not checked for secrets: the step does not set ${unset.join(' and ')}, so it stays out of the artifacts`,
      )
    },
  )

  it('pass a clean transcript, with the key set empty as a missing secret leaves it', () => {
    const transcript = JSON.stringify([{ text: 'echo ***' }])
    expect(errorsOf(env)('The transcript', transcript)).toEqual([])
    expect(
      errorsOf({ ANTHROPIC_API_KEY: '', GH_TOKEN: token })('x', transcript),
    ).toEqual([])
  })

  it('end the step with 0 on a clean transcript and 1 on one that holds the key', () => {
    const clean = check('[{"text":"echo ***"}]', env)
    expect([clean.status, clean.stdout]).toEqual([0, ''])
    const leaked = check(`[{"text":"echo ${key}"}]`, env)
    expect([leaked.status, leaked.stdout]).toEqual([
      1,
      '::error::The transcript of the agent holds the value of ANTHROPIC_API_KEY, so it stays out of the artifacts\n',
    ])
    const unchecked = check('[]', { GH_TOKEN: token })
    expect(unchecked.status).toBe(1)
  })
})
