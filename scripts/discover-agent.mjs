// Runs the agent of the weekly search (`.github/workflows/discover.yml`)
// with the Claude Agent SDK, not the Claude Code GitHub action: the API
// credit of the owner covers the Agent SDK and the API but not Claude
// Code, so the first run through the action was refused for credit
// (14 Nov 2026).
//
// The agent reads untrusted pages, so it gets only the tools of `TOOLS`,
// a call that `ALLOWED_TOOLS` does not name is denied (`dontAsk`, no
// prompt), and no settings file is read (`settingSources: []`), so nothing
// in the repository can widen them. Claude Code itself also allows a
// read-only command with its options (`git log --oneline -n 2`, a pipe to
// `tail`, a redirect to `/dev/null`), and denies `--output` and a redirect
// to a file, so `git diff` and `git log` are named bare only:
// `tests/scripts/discover-agent-rules.test.ts` checks these rules on the
// Claude Code of the SDK.
//
// Each step of the agent is one short line of the log (`linesOf`), so the
// run can be followed live in the log of the job. Every message goes to
// `$EXECUTION_FILE`, one JSON array replaced whole as the run goes, so the
// report step (`scripts/discover-report.mjs`) and the transcript artifact
// read what the agent did even after a timeout. The workflow uploads that
// file as an artifact, which any signed-in GitHub user can download from a
// public repository, so the file and the log carry the values of
// `SECRET_NAMES` (`scripts/check-secrets.mjs`) as `***`.
//
// Run: ANTHROPIC_API_KEY=<key> DAY=<YYYY-MM-DD> MAX_CANDIDATES=3 \
//   EXECUTION_FILE=<file> node scripts/discover-agent.mjs
import { query } from '@anthropic-ai/claude-agent-sdk'
import { randomUUID } from 'node:crypto'
import { mkdirSync, realpathSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

import { secretsOf } from './check-secrets.mjs'

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
  // A rule for the Write tool is written `Edit(...)`: Claude Code never
  // matches a `Write(...)` rule (`tests/scripts/discover-agent-rules.test.ts`)
  'Edit(data/snippet/*)',
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

/** @type {(env: { day: string, addedAt: string, branch: string, maxCandidates: string }) => string} */
export const promptOf = ({ day, addedAt, branch, maxCandidates }) =>
  [
    'Follow the instructions in `.github/discover-prompt.md`.',
    `Today is ${day}, and the time of the run is ${addedAt}.`,
    `The branch of the run is \`${branch}\`.`,
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

/** @type {(secrets: string[]) => (text: string) => string} */
export const redactOf = (secrets) => (text) =>
  secrets.reduce((redacted, secret) => redacted.split(secret).join('***'), text)

/**
 * One line of the log, at most `max` characters. The runner of GitHub reads
 * a line that starts with `::` as a workflow command, and `##[` anywhere in
 * a line (the old syntax): every line starts with a word of the script, and
 * `##[` is broken up. Line breaks of any kind, control and format
 * characters (a zero-width space, a soft hyphen) and runs of spaces become
 * one space, so a text of the agent can never start a line of its own or
 * hide a `##[` in plain sight.
 * @type {(max: number) => (text: string) => string}
 */
export const oneLineOf = (max) => (text) => {
  const line = text
    .replace(/[\s\p{Cc}\p{Cf}]+/gu, ' ')
    .replaceAll('##[', '# #[')
    .trim()
  return line.length > max ? `${line.slice(0, max - 3)}...` : line
}

/** The most characters of a line: a call, a text of the agent, the end */
export const MAX = { call: 100, text: 160, end: 400 }

/**
 * A line of the log before it is shown: every line goes through `shownOf`,
 * which hides the secrets before it cuts the line, so a cut never leaves
 * part of one.
 * @typedef {{ text: string, max: number }} Line
 * @type {(redact: (text: string) => string) => (line: Line) => string}
 */
export const shownOf =
  (redact) =>
  ({ text, max }) =>
    oneLineOf(max)(redact(text))

/** @type {(value: unknown) => string} */
const stringOf = (value) =>
  typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value))

/** @type {(cwd: string) => (path: string) => string} */
const pathIn = (cwd) => (path) =>
  path.startsWith(`${cwd}/`) ? path.slice(cwd.length + 1) : path

/**
 * The input of a call to `name`, as short as it is clear: the path of a
 * file, the pattern, the query, the address or the command.
 * @type {(cwd: string) => (name: string, input: unknown) => string}
 */
export const inputOf = (cwd) => (name, input) => {
  const fields =
    typeof input === 'object' && input !== null
      ? /** @type {Record<string, unknown>} */ (input)
      : {}
  const field = (key) => stringOf(fields[key] ?? '')
  switch (name) {
    case 'Read':
    case 'Edit':
    case 'Write':
      return pathIn(cwd)(field('file_path'))
    case 'Glob':
      return field('pattern')
    case 'Grep':
    case 'WebSearch':
      return JSON.stringify(field(name === 'Grep' ? 'pattern' : 'query'))
    case 'WebFetch':
      return field('url')
    case 'Bash':
      return field('command')
    default:
      return stringOf(input ?? '')
  }
}

/** @type {(message: any) => any[]} */
const contentOf = (message) =>
  Array.isArray(message?.message?.content) ? message.message.content : []

/** @type {(cwd: string, before: any[]) => (id: unknown) => string} */
const callOf = (cwd, before) => (id) => {
  const call = before
    .flatMap(contentOf)
    .find((block) => block?.type === 'tool_use' && block.id === id)
  return call === undefined
    ? ''
    : `${stringOf(call.name)}(${inputOf(cwd)(stringOf(call.name), call.input)})`
}

/** @type {(before: any[]) => (id: unknown) => boolean} */
const isDeniedIn = (before) => (id) =>
  before.some(
    (message) =>
      message?.type === 'system' &&
      message.subtype === 'permission_denied' &&
      message.tool_use_id === id,
  )

/**
 * The lines of the log for one message of the agent, given the messages
 * before it: a denial and a tool result name their call by id only. A
 * denied call comes back as a failed tool result too, after its denial,
 * so only a failure with no denial before it gets a line of its own.
 * @type {(context: { cwd: string, before: any[] }) => (message: any) => Line[]}
 */
export const linesOf =
  ({ cwd, before }) =>
  (message) => {
    const call = (text) => ({ text, max: MAX.call })
    const said = (text) => ({ text, max: MAX.text })
    if (message?.type === 'system' && message.subtype === 'init') {
      return [
        said(
          `Start: ${stringOf(message.model)}, ${stringOf(message.permissionMode)}, tools ${Array.isArray(message.tools) ? message.tools.map(stringOf).join(' ') : ''}`,
        ),
      ]
    } else if (
      message?.type === 'system' &&
      message.subtype === 'permission_denied'
    ) {
      const denied = callOf(cwd, before)(message.tool_use_id)
      return [
        call(`Denied: ${denied === '' ? stringOf(message.tool_name) : denied}`),
      ]
    } else if (message?.type === 'system' && message.subtype === 'api_retry') {
      return [
        said(
          `Retry: attempt ${stringOf(message.attempt)} of ${stringOf(message.max_retries)}, status ${stringOf(message.error_status)}, in ${stringOf(message.retry_delay_ms)} ms`,
        ),
      ]
    } else if (message?.type === 'assistant') {
      return contentOf(message).flatMap((block) =>
        block?.type === 'tool_use'
          ? [
              call(
                `Tool: ${stringOf(block.name)} ${inputOf(cwd)(stringOf(block.name), block.input)}`,
              ),
            ]
          : block?.type === 'text' &&
              typeof block.text === 'string' &&
              block.text.trim() !== ''
            ? [said(`Text: ${block.text}`)]
            : [],
      )
    } else if (message?.type === 'user') {
      return contentOf(message).flatMap((block) =>
        block?.type === 'tool_result' &&
        block.is_error === true &&
        !isDeniedIn(before)(block.tool_use_id)
          ? [call(`Failed: ${callOf(cwd, before)(block.tool_use_id)}`)]
          : [],
      )
    } else {
      return []
    }
  }

/**
 * Whether the agent ended with a result and no error: a result that does
 * not say `is_error: false` counts as an error, so a doubt fails the run.
 * The report (`scripts/discover-report.mjs`) reads it the same way.
 * @type {(result: any) => boolean}
 */
export const endedWellOf = (result) => result?.is_error === false

/**
 * Why a result is an error, in the words of the agent or of the SDK.
 * @type {(result: any) => string}
 */
export const reasonOf = (result) =>
  typeof result?.result === 'string' && result.result !== ''
    ? result.result
    : Array.isArray(result?.errors) && result.errors.length > 0
      ? result.errors.map(stringOf).join('; ')
      : 'no reason'

/** @type {(cost: unknown) => string} */
const dollarsOf = (cost) =>
  typeof cost === 'number' && Number.isFinite(cost)
    ? cost.toFixed(2)
    : stringOf(cost)

/**
 * The last lines of the log: how the agent ended, and why the run stopped,
 * when something threw (the SDK throws after an error result too).
 * @type {(result: any, thrown: string | undefined) => Line[]}
 */
export const endLinesOf = (result, thrown) => {
  const end = (text) => ({ text, max: MAX.end })
  const denied = Array.isArray(result?.permission_denials)
    ? result.permission_denials.length
    : 0
  const reason = endedWellOf(result) ? 'ok' : reasonOf(result)
  return [
    end(
      result === undefined
        ? 'The agent ended with no result.'
        : `The agent ended: ${stringOf(result.subtype)}, ${stringOf(result.num_turns)} turns, ${dollarsOf(result.total_cost_usd)} dollars, ${denied} denied: ${reason}.`,
    ),
    ...(thrown === undefined ? [] : [end(`The run stopped: ${thrown}`)]),
  ]
}

/** @type {(result: any, thrown: string | undefined) => number} */
export const exitCodeOf = (result, thrown) =>
  thrown === undefined && endedWellOf(result) ? 0 : 1

/**
 * Whether a message changes the transcript enough to write it again:
 * progress and token counts come many times a turn, and a rewrite costs
 * the whole file, so they wait for the next message.
 * @type {(message: any) => boolean}
 */
export const isWorthWritingOf = (message) =>
  !(
    message?.type === 'tool_progress' ||
    (message?.type === 'system' && message.subtype === 'thinking_tokens')
  )

/**
 * One run of the agent over the messages of `stream`: the lines of each
 * message go to `print`, between the two markers of `::stop-commands::`,
 * then the transcript to `write`, redacted, after each message that
 * `isWorthWritingOf` keeps. The lines are safe already (`oneLineOf`); the
 * markers also stop a workflow command in any other output of the
 * process. Returns the exit code.
 * @type {(context: { stream: () => AsyncIterable<any>, write: (text: string) => void, print: (line: string) => void, cwd: string, redact: (text: string) => string, marker: string }) => Promise<number>}
 */
export const run = async ({ stream, write, print, cwd, redact, marker }) => {
  const kept = []
  const show = (lines) => lines.map(shownOf(redact)).forEach(print)
  print(`::stop-commands::${marker}`)
  const thrown = await (async () => {
    try {
      for await (const message of stream()) {
        const lines = linesOf({ cwd, before: kept })(message)
        kept.push(message)
        show(lines)
        if (isWorthWritingOf(message)) {
          write(redact(JSON.stringify(kept, null, 2)))
        }
      }
      return undefined
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  })()
  const result = kept.findLast((message) => message?.type === 'result')
  show(endLinesOf(result, thrown))
  print(`::${marker}::`)
  return exitCodeOf(result, thrown)
}

// A whole file at each step, never half of one: a timeout can stop the
// process in the middle of a write
const writeWholeTo = (file) => (text) => {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(`${file}.part`, text)
  renameSync(`${file}.part`, file)
}

const main = async () => {
  process.exitCode = await run({
    stream: () =>
      query({
        prompt: (() => {
          const day = process.env.DAY ?? new Date().toISOString().slice(0, 10)
          return promptOf({
            day,
            addedAt: process.env.ADDED_AT ?? `${day}T00:00:00Z`,
            branch: process.env.BRANCH ?? `discover/${day}`,
            maxCandidates: process.env.MAX_CANDIDATES ?? '3',
          })
        })(),
        options,
      }),
    write: writeWholeTo(
      // In `tmp/`, which git ignores, when no file is named
      process.env.EXECUTION_FILE ?? 'tmp/discover/execution.json',
    ),
    print: (line) => console.log(line),
    cwd: process.cwd(),
    redact: redactOf(secretsOf(process.env)),
    marker: `discover-agent-${randomUUID()}`,
  })
}

// The real path on both sides: `import.meta.url` is one, and a path through
// a link (`/tmp` on macOS) would otherwise skip the run with no word
if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  await main()
}
