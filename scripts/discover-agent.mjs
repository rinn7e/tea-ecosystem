// Runs the agent of the weekly search (`.github/workflows/discover.yml`)
// with the Claude Agent SDK, not the Claude Code GitHub action: the API
// credit of the owner covers the Agent SDK and the API but not Claude
// Code, so the first run through the action was refused for credit
// (14 Nov 2026).
//
// The agent reads untrusted pages, so it gets only the tools of `TOOLS`,
// every call that `ALLOWED_TOOLS` does not name is denied (`dontAsk`, no
// prompt), and no settings file is read (`settingSources: []`), so nothing
// in the repository can widen them. `git diff` and `git log` are allowed
// bare only, as their options can write files (`--output`). Every message
// goes to `$EXECUTION_FILE`, one JSON array rewritten after each message,
// so the report step reads what the agent did even after a timeout.
//
// Run: ANTHROPIC_API_KEY=<key> DAY=<YYYY-MM-DD> MAX_CANDIDATES=3 \
//   EXECUTION_FILE=<file> node scripts/discover-agent.mjs
import { query } from '@anthropic-ai/claude-agent-sdk'
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const TOOLS = [
  'Read',
  'Glob',
  'Grep',
  'WebSearch',
  'WebFetch',
  'Edit',
  'Write',
  'Bash',
]

export const ALLOWED_TOOLS = [
  'Read',
  'Glob',
  'Grep',
  'WebSearch',
  'WebFetch',
  'Edit(data/frameworks.json)',
  'Edit(data/adjacent.json)',
  'Write(data/snippet/*)',
  'Bash(git switch *)',
  'Bash(git add *)',
  'Bash(git commit *)',
  'Bash(git branch *)',
  'Bash(git restore data/frameworks.json data/adjacent.json)',
  'Bash(git clean -fdq data/snippet/)',
  'Bash(git status)',
  'Bash(git diff)',
  'Bash(git log)',
  'Bash(pnpm run format)',
  'Bash(pnpm run test)',
  'Bash(gh repo view *)',
  'Bash(gh search repos *)',
]

/** @type {(env: { day: string, maxCandidates: string }) => string} */
export const promptOf = ({ day, maxCandidates }) =>
  [
    'Follow the instructions in `.github/discover-prompt.md`.',
    `Today is ${day}.`,
    `Propose at most ${maxCandidates} candidates.`,
  ].join('\n')

/** @type {import('@anthropic-ai/claude-agent-sdk').Options} */
export const options = {
  model: 'claude-opus-5-5',
  effort: 'medium',
  maxTurns: 150,
  maxBudgetUsd: 5,
  tools: TOOLS,
  allowedTools: ALLOWED_TOOLS,
  permissionMode: 'dontAsk',
  settingSources: [],
  systemPrompt: { type: 'preset', preset: 'claude_code' },
  env: {
    ...process.env,
    CLAUDE_AGENT_SDK_CLIENT_APP:
      'tea-ecosystem-discover (+https://github.com/rinn7e/tea-ecosystem)',
  },
}

const main = async () => {
  const file = process.env.EXECUTION_FILE ?? 'discover-execution.json'
  const messages = []
  // The SDK also throws when the agent fails (a refused key, no credit):
  // the messages kept so far still carry the reason
  const thrown = await (async () => {
    try {
      for await (const message of query({
        prompt: promptOf({
          day: process.env.DAY ?? new Date().toISOString().slice(0, 10),
          maxCandidates: process.env.MAX_CANDIDATES ?? '3',
        }),
        options,
      })) {
        messages.push(message)
        writeFileSync(file, JSON.stringify(messages, null, 2))
      }
      return undefined
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  })()
  const result = messages.findLast((message) => message.type === 'result')
  console.log(
    result === undefined
      ? 'The agent ended with no result.'
      : `The agent ended: ${result.subtype}, ${result.num_turns} turns, ${result.total_cost_usd} dollars: ${result.is_error ? (result.result ?? result.errors?.join('; ')) : 'ok'}.`,
  )
  console.log(thrown === undefined ? '' : `The SDK stopped: ${thrown}`)
  process.exitCode =
    thrown !== undefined || result === undefined || result.is_error ? 1 : 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main()
}
