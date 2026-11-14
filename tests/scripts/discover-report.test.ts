import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { reportOf } from '../../scripts/discover-report.mjs'
import { scriptOf } from '../helper/script-repo'

// The report of the weekly search in the summary of its run: the execution
// file is written as the run goes, so a run that timed out has one too,
// with no result, and must never read as a report

const said = (text: string) => ({
  type: 'assistant',
  message: { content: [{ type: 'text', text }] },
})
const init = { type: 'system', subtype: 'init' }
const artifact = 'discover-transcript-2'
const stopped = `Its full transcript is the artifact \`${artifact}\` of this run, unless it held a secret.`
const reportIn = (messages: unknown[]): string => reportOf(messages, artifact)
const ended = (more: Record<string, unknown>) => ({
  type: 'result',
  subtype: 'success',
  ...more,
})

describe('the report of the discovery agent', () => {
  it('is the result of a run that ended well, its last result', () => {
    expect(
      reportIn([
        init,
        ended({ is_error: true, result: 'Overloaded' }),
        said('Searching.'),
        ended({ is_error: false, result: 'Report' }),
      ]),
    ).toBe('Report')
  })

  it('says that a run cut off before its result did not finish, with what the agent said last', () => {
    expect(
      reportIn([
        init,
        said('Searching.'),
        said('Now let me check the stars.'),
        {
          type: 'user',
          message: { content: [{ type: 'text', text: 'A page said this.' }] },
        },
        {
          type: 'assistant',
          message: { content: [{ type: 'tool_use', text: 'Not text.' }] },
        },
      ]),
    ).toBe(
      [
        `No report: the agent did not finish (it has no result: it failed or timed out). ${stopped}`,
        '',
        'What it said last:',
        '',
        'Now let me check the stars.',
      ].join('\n'),
    )
  })

  it('never takes a result that does not say it had no error, or has no text, for a report', () => {
    expect(reportIn([ended({ result: 'Report' })])).toBe(
      `No report: the agent did not finish (an error: Report). ${stopped}`,
    )
    expect(reportIn([ended({ is_error: false })])).toBe(
      `No report: the agent did not finish (an error: no reason). ${stopped}`,
    )
  })

  it('says why a run that ended with an error did not finish', () => {
    expect(
      reportIn([init, ended({ is_error: true, result: 'Invalid API key' })]),
    ).toBe(
      `No report: the agent did not finish (an error: Invalid API key). ${stopped}`,
    )
    expect(
      reportIn([
        said('Half way.'),
        {
          type: 'result',
          subtype: 'error_max_turns',
          is_error: true,
          errors: ['Reached maximum number of turns (150)'],
        },
      ]).split('\n')[0],
    ).toBe(
      `No report: the agent did not finish (error_max_turns: Reached maximum number of turns (150)). ${stopped}`,
    )
  })

  it('says that the agent never started when there is no file, also when run through a link', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'discover-report-'))
    try {
      const file = path.join(dir, 'execution.json')
      // A path through a link, as `/tmp` is on macOS, must still run it
      const link = path.join(dir, 'report.mjs')
      symlinkSync(scriptOf('discover-report.mjs'), link)
      const reportFrom = () =>
        spawnSync(process.execPath, [link, file], {
          encoding: 'utf8',
          env: { ...process.env, TRANSCRIPT_ARTIFACT: artifact },
        }).stdout
      expect(reportFrom()).toBe('No report: the agent never started.\n')
      writeFileSync(file, JSON.stringify([init, said('Searching.')]))
      expect(reportFrom()).toBe(
        [
          `No report: the agent did not finish (it has no result: it failed or timed out). ${stopped}`,
          '',
          'What it said last:',
          '',
          'Searching.',
          '',
        ].join('\n'),
      )
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
