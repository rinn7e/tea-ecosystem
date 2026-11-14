// Fills `stars`, `createdAt` and `updatedAt` of every entry whose `repo`
// is a repository in `data/frameworks.json` and `data/adjacent.json`, from
// the API of the host in the URL of its `repo` (`fetchRepo` in
// `repo-stats.mjs` says what each host gives). An entry with no public
// source has its website in `repo` instead, with the same URL in `website`
// (`hasPublicRepo` in `src/common/type/framework.ts`), and is left as it
// is.
//
// `stars` is the star count of `repo`, `createdAt` the day the repository
// was created (of `originRepo` when the project moved). A repository that
// moved to another owner or name has its `repo`, and every `website`,
// `source` and `snippetSource` under its old address, rewritten to the new
// one (MOVED). It also prints the entries whose `status` disagrees with the
// archived flag of their host (STATUS?), and leaves them for a person to
// decide. An entry its host does not answer for keeps its values, and the
// run says so (SKIPPED). Every link of every entry is fetched (`networkOf`
// in `repo-stats.mjs` says how), and one that does not answer 200 after its
// redirects (BROKEN), or answers at another address (REDIRECTS), is printed
// and left as it is. A slow run stops in time (NOT CHECKED, SKIPPED).
//
// In GitHub Actions (`.github/workflows/refresh-stats.yml`) the same report
// goes to the job summary (`GITHUB_STEP_SUMMARY`); elsewhere it is printed
// at the end.
//
// Run: GITHUB_TOKEN=<token> node scripts/fetch-repo-stats.mjs
// The token is optional and only sent to the GitHub API: without it the
// GitHub API allows 60 requests an hour, fewer than one run needs. Then
// format the files: pnpm run format
import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'

import { linesOf, networkOf, refreshEntries, summaryOf } from './repo-stats.mjs'

const FILES = ['../data/frameworks.json', '../data/adjacent.json'].map(
  (path) => new URL(path, import.meta.url),
)

// How long, from the start of the run, the links may take to check, and
// the stats to fetch: what is still left then is reported as not checked
// or skipped, so the run ends well within the 30 minutes of its job
// (`refresh-stats.yml`), its data written and its summary out. The links
// stop first, so they never cost the stats.
const LINK_CHECK_MS = 15 * 60_000
const STATS_MS = 22 * 60_000

const start = Date.now()
const network = networkOf({
  fetch,
  sleep,
  now: Date.now,
  token: process.env.GITHUB_TOKEN,
  deadlines: { stats: start + STATS_MS, links: start + LINK_CHECK_MS },
})

const reports = []
for (const file of FILES) {
  const { entries, reports: fileReports } = await refreshEntries(
    network,
    JSON.parse(await readFile(file, 'utf8')),
    (report) => {
      for (const line of linesOf(report)) {
        console.log(line)
      }
    },
  )
  reports.push(...fileReports)
  await writeFile(file, `${JSON.stringify(entries, null, 2)}\n`)
}

const summary = `${summaryOf(reports)}\n`
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, summary)
} else {
  console.log(`\n${summary}`)
}
