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
// bare only, as their options can write files (`--output`); Claude Code
// itself allows their read-only options and denies `--output` and a
// redirect to a file, which `tests/scripts/discover-agent-rules.test.ts`
// checks on the Claude Code of the SDK.
//
// Each step of the agent is one short line of the log, so the run can be
// followed live in the log of the job. Every message goes to
// `$EXECUTION_FILE`, one JSON array replaced whole after each message, so
// the report step and the transcript artifact read what the agent did even
// after a timeout. The workflow uploads that file as an artifact, which any
// signed-in GitHub user can download from a public repository, so the file
// and the log carry the values of `SECRET_NAMES` as `***`.
//
// Run: ANTHROPIC_API_KEY=<key> DAY=<YYYY-MM-DD> MAX_CANDIDATES=3 \
//   EXECUTION_FILE=<file> node scripts/discover-agent.mjs
import { query } from '@anthropic-ai/claude-agent-sdk'
import { randomUUID } from 'node:crypto'
import { renameSync, writeFileSync } from 'node:fs'
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

export const SECRET_NAMES = ['ANTHROPIC_API_KEY', 'GH_TOKEN', 'GITHUB_TOKEN']

/**
 * The secrets of `env` that the log and the transcript hide. A value under
 * 8 characters is no real key, and hiding it would garble the text.
 * @type {(env: Record<string, string | undefined>) => string[]}
 */
export const secretsOf = (env) =>
  SECRET_NAMES.map((name) => env[name] ?? '').filter(
    (value) => value.length >= 8,
  )

/** @type {(secrets: string[]) => (text: string) => string} */
export const redactOf = (secrets) => (text) =>
  secrets.reduce((redacted, secret) => redacted.split(secret).join('***'), text)

/**
 * One line of the log, at most `max` characters. The runner of GitHub reads
 * a line that starts with `::` as a workflow command, and `##[` anywhere in
 * a line (the old syntax): every line starts with a word of the script, and
 * `##[` is broken up. Line breaks of any kind and runs of spaces become one
 * space, so a text of the agent can never start a line of its own.
 * @type {(max: number) => (text: string) => string}
 */
export const oneLineOf = (max) => (text) => {
  const line = text
    .replace(/[\s\u0000-\u001f\u007f-\u009f]+/g, ' ')
    .replaceAll('##[', '# #[')
    .trim()
  return line.length > max ? `${line.slice(0, max - 3)}...` : line
}

const inputLineOf = oneLineOf(100)
const textLineOf = oneLineOf(160)

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

/**
 * The lines of the log for one message of the agent, given the messages
 * before it (a denial names its call by id only), with `redact` applied
 * before a line is cut, so a cut never leaves part of a secret.
 * @type {(context: { cwd: string, redact: (text: string) => string, before: any[] }) => (message: any) => string[]}
 */
export const linesOf =
  ({ cwd, redact, before }) =>
  (message) => {
    const line = (max) => (text) => max(redact(text))
    if (message?.type === 'system' && message.subtype === 'init') {
      return [
        line(textLineOf)(
          `Start: ${stringOf(message.model)}, ${stringOf(message.permissionMode)}, tools ${Array.isArray(message.tools) ? message.tools.join(' ') : ''}`,
        ),
      ]
    } else if (
      message?.type === 'system' &&
      message.subtype === 'permission_denied'
    ) {
      const call = before
        .flatMap(contentOf)
        .find(
          (block) =>
            block?.type === 'tool_use' && block.id === message.tool_use_id,
        )
      return [
        line(inputLineOf)(
          `Denied: ${stringOf(message.tool_name)}(${call === undefined ? '' : inputOf(cwd)(stringOf(call.name), call.input)})`,
        ),
      ]
    } else if (message?.type === 'assistant') {
      return contentOf(message).flatMap((block) =>
        block?.type === 'tool_use'
          ? [
              line(inputLineOf)(
                `Tool: ${stringOf(block.name)} ${inputOf(cwd)(stringOf(block.name), block.input)}`,
              ),
            ]
          : block?.type === 'text' &&
              typeof block.text === 'string' &&
              block.text.trim() !== ''
            ? [line(textLineOf)(`Text: ${block.text}`)]
            : [],
      )
    } else {
      return []
    }
  }

/**
 * The last lines of the log: how the agent ended, and why the SDK threw,
 * when it did (it throws after an error result too).
 * @type {(redact: (text: string) => string) => (result: any, thrown: string | undefined) => string[]}
 */
export const endLinesOf = (redact) => (result, thrown) => {
  const line = (text) => oneLineOf(400)(redact(text))
  const denied = Array.isArray(result?.permission_denials)
    ? result.permission_denials.length
    : 0
  const reason = result?.is_error
    ? stringOf(result.result ?? result.errors?.join('; ') ?? 'no reason')
    : 'ok'
  return [
    line(
      result === undefined
        ? 'The agent ended with no result.'
        : `The agent ended: ${stringOf(result.subtype)}, ${stringOf(result.num_turns)} turns, ${stringOf(result.total_cost_usd)} dollars, ${denied} denied: ${reason}.`,
    ),
    ...(thrown === undefined ? [] : [line(`The SDK stopped: ${thrown}`)]),
  ]
}

/** @type {(result: any, thrown: string | undefined) => number} */
export const exitCodeOf = (result, thrown) =>
  thrown !== undefined || result === undefined || result.is_error ? 1 : 0

// A whole file at each step, never half of one: a timeout can stop the
// process in the middle of a write
const writeWhole = (file, text) => {
  writeFileSync(`${file}.part`, text)
  renameSync(`${file}.part`, file)
}

const main = async () => {
  const file = process.env.EXECUTION_FILE ?? 'discover-execution.json'
  const redact = redactOf(secretsOf(process.env))
  const messages = []
  // The lines are safe already (`oneLineOf`); this also stops a workflow
  // command in any other output of the process, until the marker comes back
  const marker = `discover-agent-${randomUUID()}`
  console.log(`::stop-commands::${marker}`)
  const thrown = await (async () => {
    try {
      for await (const message of query({
        prompt: promptOf({
          day: process.env.DAY ?? new Date().toISOString().slice(0, 10),
          maxCandidates: process.env.MAX_CANDIDATES ?? '3',
        }),
        options,
      })) {
        const lines = linesOf({ cwd: process.cwd(), redact, before: messages })(
          message,
        )
        messages.push(message)
        writeWhole(file, redact(JSON.stringify(messages, null, 2)))
        lines.forEach((line) => console.log(line))
      }
      return undefined
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  })()
  const result = messages.findLast((message) => message.type === 'result')
  endLinesOf(redact)(result, thrown).forEach((line) => console.log(line))
  console.log(`::${marker}::`)
  process.exitCode = exitCodeOf(result, thrown)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main()
}
