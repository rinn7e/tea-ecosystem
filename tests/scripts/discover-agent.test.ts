import { describe, expect, it } from 'vitest'

import {
  ALLOWED_TOOLS,
  TOOLS,
  options,
  promptOf,
} from '../../scripts/discover-agent.mjs'

// The agent reads untrusted pages: these options are what keeps it to the
// data of new entries, so a change to any of them shows here
describe('the options of the discovery agent', () => {
  it('deny every call the list does not name, and read no settings file', () => {
    expect(options.permissionMode).toBe('dontAsk')
    expect(options.settingSources).toEqual([])
    expect(options.allowDangerouslySkipPermissions).toBeUndefined()
  })

  it('cap the run in turns and dollars', () => {
    expect(options.maxTurns).toBe(150)
    expect(options.maxBudgetUsd).toBe(5)
  })

  it('offer only the tools the search needs', () => {
    expect(options.tools).toEqual(TOOLS)
    expect(TOOLS).not.toContain('Task')
    expect(TOOLS).not.toContain('NotebookEdit')
  })

  it('let the agent write only the data of an entry, and run only bare git reads', () => {
    const writes = ALLOWED_TOOLS.filter(
      (tool) => tool.startsWith('Edit') || tool.startsWith('Write'),
    )
    expect(writes).toEqual([
      'Edit(data/frameworks.json)',
      'Edit(data/adjacent.json)',
      'Write(data/snippet/*)',
    ])
    // Their options can write files (`--output`)
    expect(ALLOWED_TOOLS).toContain('Bash(git diff)')
    expect(ALLOWED_TOOLS).toContain('Bash(git log)')
    expect(
      ALLOWED_TOOLS.filter((tool) => /^Bash\(git (diff|log) /.test(tool)),
    ).toEqual([])
    expect(ALLOWED_TOOLS).not.toContain('Bash')
    expect(ALLOWED_TOOLS.filter((tool) => tool.includes('push'))).toEqual([])
  })

  it('name the day and the cap in the prompt', () => {
    expect(promptOf({ day: '2026-11-16', maxCandidates: '3' })).toBe(
      [
        'Follow the instructions in `.github/discover-prompt.md`.',
        'Today is 2026-11-16.',
        'Propose at most 3 candidates.',
      ].join('\n'),
    )
  })
})
