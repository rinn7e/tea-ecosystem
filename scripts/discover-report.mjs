// Prints the report of the agent of the weekly search, for the summary of
// its run (`.github/workflows/discover.yml`), from the execution file that
// `scripts/discover-agent.mjs` writes as the run goes. The file is there
// after a timeout too, with no result: such a run is said to have stopped,
// with what the agent said last, and never shown as if it were a report.
//
// Run: node scripts/discover-report.mjs <execution file>
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { endedWellOf, reasonOf } from './discover-agent.mjs'

/** @type {(message: any) => string[]} */
const textsOf = (message) =>
  message?.type === 'assistant' && Array.isArray(message.message?.content)
    ? message.message.content.flatMap((block) =>
        block?.type === 'text' && typeof block.text === 'string'
          ? [block.text]
          : [],
      )
    : []

/** @type {(result: any) => string} */
const whyOf = (result) =>
  result === undefined
    ? 'it has no result: it failed or timed out'
    : `${String(result.subtype)}: ${reasonOf(result)}`

/**
 * The report of a run, from its messages (`undefined` when it wrote none,
 * as the agent never started).
 * @type {(messages: any[] | undefined) => string}
 */
export const reportOf = (messages) => {
  if (messages === undefined) {
    return 'No report: the agent never started.'
  } else {
    const result = messages.findLast((message) => message?.type === 'result')
    const last = messages.flatMap(textsOf).at(-1)
    return endedWellOf(result) && typeof result.result === 'string'
      ? result.result
      : [
          `No report: the agent did not finish (${whyOf(result)}). Its full transcript is the artifact \`discover-transcript\` of this run.`,
          ...(last === undefined ? [] : ['', 'What it said last:', '', last]),
        ].join('\n')
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  const file = process.argv[2] ?? ''
  console.log(
    reportOf(
      existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined,
    ),
  )
}
