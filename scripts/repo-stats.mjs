// The logic of `fetch-repo-stats.mjs`, apart from its reads and writes: it
// gets the network as two functions, `getJson` (the body of an API answer,
// or a throw) and `getStatus` (the HTTP status of a page and the address it
// ends at after its redirects, or a throw), so the tests run it on made-up
// answers with no network (`tests/scripts/repo-stats.test.ts`). `networkOf`
// builds the two from a `fetch`, so the tests run it on a made-up `fetch`
// too.

// The types below are for the tests, which import this file from
// TypeScript (`allowJs` in `tsconfig.json`): an entry is an object of
// `data/*.json`, its fields as `Framework` in `src/common/type/framework.ts`.
//
/**
 * What the run saw about one entry: its numbers from its host (`stats`), or
 * why its host did not answer (`skipped`), or neither when it has no public
 * repository; and its move, its status to check, its broken links, its
 * links that redirect, its links the run had no time left to check and its
 * links whose host refused a script.
 *
 * @typedef {{
 *   id: string
 *   stats?: { stars: number, createdAt: string, updatedAt: string, archived: boolean }
 *   moved?: { from: string, to: string, rewritten: boolean }
 *   statusToCheck?: { status: string, archived: boolean }
 *   skipped?: string
 *   brokenLinks: { url: string, reason: string }[]
 *   redirects: { url: string, to: string }[]
 *   notChecked: string[]
 *   refused: string[]
 * }} Report
 *
 * @typedef {{
 *   getJson: (url: string) => Promise<any>
 *   getStatus: (url: string) => Promise<{ status: number, url: string }>
 * }} Network
 */

// The User-Agent of every request: the tool and the repository, never a
// person
export const USER_AGENT =
  'tea-ecosystem-stats (+https://github.com/rinn7e/tea-ecosystem)'

// The fields of an entry that hold a link: the run checks each of them, and
// a move rewrites the ones under the old address. `originRepo` is not one:
// it is where the project lived before, on purpose.
export const LINK_FIELDS = [
  'repo',
  'website',
  'source',
  'snippetSource',
  'unmaintainedNotice',
]

const dayOf = (timestamp) => timestamp.slice(0, 10)

const withoutSlash = (url) => url.replace(/\/$/, '')

// Whether the source of an entry is public: the same rule as
// `hasPublicRepo` in `src/common/type/framework.ts`, an entry with no public
// source giving `website` the URL of its `repo`
export const hasPublicRepo = (entry) =>
  entry.website === undefined ||
  withoutSlash(entry.repo) !== withoutSlash(entry.website)

// Whether `url` is `address` itself or a page under it (a folder, a file, an
// anchor), so `https://github.com/a/b-docs` is not under
// `https://github.com/a/b`. Owners and names are compared without case, as
// the hosts do.
const isUnder = (address, url) => {
  const base = withoutSlash(address).toLowerCase()
  const lower = url.toLowerCase()
  return (
    lower === base ||
    ['/', '?', '#'].some((separator) => lower.startsWith(base + separator))
  )
}

// The address of a repository from the name its host gives it. An answer
// with no name is not trusted: without this, it would read as a move to
// `https://<host>/undefined`.
const addressOf = (host, fullName) => {
  if (typeof fullName !== 'string' || fullName === '') {
    throw new Error(`${host}: the answer names no repository`)
  } else {
    return `https://${host}/${fullName}`
  }
}

// Why a request failed: `fetch` says only "fetch failed", and keeps the
// reason (a name that does not resolve, a refused connection) in its cause
const reasonOf = (error) =>
  error.cause?.message === undefined
    ? error.message
    : `${error.message}: ${error.cause.message}`

// A request the run did not make because its time ran out
// (`networkOf`): a link so is not checked, not broken, and an entry so is
// skipped
export class OutOfTime extends Error {}

// Whether an address is `https://<host>/<owner>/<name>`, the shape `repo`
// must have (test "give every repository as a full URL of owner and
// name"): a GitLab project that moved into a subgroup has a longer one
const isOwnerAndName = (address) =>
  new URL(address).pathname.split('/').filter((part) => part !== '').length ===
  2

const sameAddress = (a, b) =>
  withoutSlash(a).toLowerCase() === withoutSlash(b).toLowerCase()

// The numbers of a repository and its own address on its host (`full_name`
// on GitHub and Gitea, `path_with_namespace` on GitLab), which differs from
// `repo` when the repository moved: the APIs follow the redirect of an old
// address and answer for the new one.
//
// - GitHub (`github.com`): `updatedAt` is the last push (`pushed_at`, not
//   `updated_at`, which a star also changes).
// - GitLab (`gitlab.com`, or a host named `gitlab.*`): `updatedAt` is the
//   last activity.
// - Any other host is read as a Gitea or Forgejo (Codeberg, a self-hosted
//   Gitea): `updatedAt` is its `updated_at`.
//
// `repo` is a full URL: `https://<host>/<owner>/<name>`
export const fetchRepo = async (getJson, repo) => {
  const { host, pathname } = new URL(repo)
  const [owner, name] = pathname.split('/').filter((part) => part !== '')
  if (host === 'github.com') {
    const body = await getJson(`https://api.github.com/repos/${owner}/${name}`)
    return {
      stars: body.stargazers_count,
      createdAt: dayOf(body.created_at),
      updatedAt: dayOf(body.pushed_at),
      archived: body.archived,
      address: addressOf(host, body.full_name),
    }
  } else if (host === 'gitlab.com' || host.startsWith('gitlab.')) {
    const path = encodeURIComponent(`${owner}/${name}`)
    const body = await getJson(`https://${host}/api/v4/projects/${path}`)
    return {
      stars: body.star_count,
      createdAt: dayOf(body.created_at),
      updatedAt: dayOf(body.last_activity_at),
      archived: body.archived,
      address: addressOf(host, body.path_with_namespace),
    }
  } else {
    const body = await getJson(`https://${host}/api/v1/repos/${owner}/${name}`)
    return {
      stars: body.stars_count,
      createdAt: dayOf(body.created_at),
      updatedAt: dayOf(body.updated_at),
      archived: body.archived,
      address: addressOf(host, body.full_name),
    }
  }
}

// The entry after its repository moved to `to`: its `repo` is `to`, and every
// link under the old address points to the same place under the new one.
// The fields keep their order, so the data file changes only where it must.
/** @type {(entry: any, to: string) => any} */
export const movedEntry = (entry, to) => {
  const from = withoutSlash(entry.repo)
  const moveLink = (url) =>
    isUnder(from, url) ? to + url.slice(from.length) : url
  return Object.fromEntries(
    Object.entries(entry).map(([field, value]) =>
      field === 'repo'
        ? [field, to]
        : LINK_FIELDS.includes(field)
          ? [field, moveLink(value)]
          : [field, value],
    ),
  )
}

// The links of an entry, each once (a `snippetSource` may be its `website`)
/** @type {(entry: any) => string[]} */
export const linksOf = (entry) => [
  ...new Set(
    LINK_FIELDS.map((field) => entry[field]).filter((url) => url !== undefined),
  ),
]

// A link as a page: its anchor is not sent to the host, and a trailing
// slash is the same page
const pageOf = (url) => {
  const parsed = new URL(url)
  parsed.hash = ''
  return withoutSlash(parsed.href)
}

// The links of an entry that do not answer 200 after their redirects, with
// why (`brokenLinks`), and those that answer 200 at another address
// (`redirects`): a branch renamed to `main`, a repository that moved. Both
// are left for a person. A link the run had no time left for is only
// counted (`notChecked`), and so is one whose host refused a script (403,
// `refused`): npm and sites behind a bot check answer it to every script
// while the page works in a browser, so it says nothing about the link.
const checkLinks = async (getStatus, entry) => {
  const checks = await Promise.all(
    linksOf(entry).map(async (url) => {
      try {
        const answer = await getStatus(url)
        return answer.status === 403
          ? { refused: url }
          : answer.status !== 200
            ? { broken: { url, reason: `${answer.status}` } }
            : pageOf(answer.url) !== pageOf(url)
              ? { redirect: { url, to: answer.url } }
              : {}
      } catch (error) {
        return error instanceof OutOfTime
          ? { notChecked: url }
          : { broken: { url, reason: reasonOf(error) } }
      }
    }),
  )
  return {
    brokenLinks: checks.flatMap((check) =>
      check.broken === undefined ? [] : [check.broken],
    ),
    redirects: checks.flatMap((check) =>
      check.redirect === undefined ? [] : [check.redirect],
    ),
    notChecked: checks.flatMap((check) =>
      check.notChecked === undefined ? [] : [check.notChecked],
    ),
    refused: checks.flatMap((check) =>
      check.refused === undefined ? [] : [check.refused],
    ),
  }
}

// The stats of an entry from the host of its `repo`, and the address its
// host gives it. `createdAt` is of `originRepo` when the project moved
// there from another repository.
const statsOf = async (getJson, entry) => {
  const { stars, updatedAt, archived, address, ...current } = await fetchRepo(
    getJson,
    entry.repo,
  )
  const { createdAt } =
    entry.originRepo === undefined
      ? current
      : await fetchRepo(getJson, entry.originRepo)
  return { stars, createdAt, updatedAt, archived, address }
}

// One entry, refreshed: its numbers from its host, its links moved when its
// repository moved, and a report of what the run saw. `status` is never
// changed: when it disagrees with the archived flag of the host, the report
// says so (`statusToCheck`) and a person decides. An entry whose author
// says it is no longer maintained (`unmaintainedNotice`) counts as archived
// though its host does not say so. A host that does not
// answer, or a run out of time, leaves the entry as it was (`skipped`). An
// entry with no public repository keeps its values. Every link of the
// result is checked, unless the run is out of time (`notChecked`); a broken
// one, or one that redirects, is reported, never changed.
/** @type {(network: Network, entry: any) => Promise<{ entry: any, report: Report }>} */
export const refreshEntry = async ({ getJson, getStatus }, entry) => {
  const { refreshed, report } = await (async () => {
    if (!hasPublicRepo(entry)) {
      return { refreshed: entry, report: { id: entry.id } }
    } else {
      try {
        const { stars, createdAt, updatedAt, archived, address } =
          await statsOf(getJson, entry)
        // A move to an address `repo` cannot hold is reported, not written,
        // so the data still passes the tests
        const moved = !sameAddress(address, entry.repo)
        const rewritten = moved && isOwnerAndName(address)
        const placed = rewritten ? movedEntry(entry, address) : entry
        return {
          refreshed: { ...placed, stars, createdAt, updatedAt },
          report: {
            id: entry.id,
            stats: { stars, createdAt, updatedAt, archived },
            ...(moved
              ? { moved: { from: entry.repo, to: address, rewritten } }
              : {}),
            ...((archived || entry.unmaintainedNotice !== undefined) !==
            (entry.status === 'archived')
              ? { statusToCheck: { status: entry.status, archived } }
              : {}),
          },
        }
      } catch (error) {
        return {
          refreshed: entry,
          report: { id: entry.id, skipped: reasonOf(error) },
        }
      }
    }
  })()
  const links = await checkLinks(getStatus, refreshed)
  return { entry: refreshed, report: { ...report, ...links } }
}

// Every entry of a file, one after the other, so the hosts see one request
// of the run at a time (the links of one entry are checked together).
// `onReport` gets the report of each entry as soon as it is done, so a long
// run shows how far it got.
/** @type {(network: Network, entries: any[], onReport?: (report: Report) => void) => Promise<{ entries: any[], reports: Report[] }>} */
export const refreshEntries = async (network, entries, onReport) => {
  const results = []
  for (const entry of entries) {
    const result = await refreshEntry(network, entry)
    onReport?.(result.report)
    results.push(result)
  }
  return {
    entries: results.map((result) => result.entry),
    reports: results.map((result) => result.report),
  }
}

// What a move that was not written says
const NOT_REWRITTEN = ' (left unchanged: not an owner and a name)'

// The lines the run prints for one entry, as the script always did: its
// numbers (with `STATUS?` when its status disagrees with its host), or
// `SKIPPED` with why, then one line per move, per broken link, per link
// that redirects, per link not checked and per link its host refused
/** @type {(report: Report) => string[]} */
export const linesOf = (report) => [
  ...(report.stats !== undefined
    ? [
        `${report.id}: ${report.stats.stars} stars, ${report.stats.createdAt} .. ${report.stats.updatedAt}${report.stats.archived ? ' archived' : ''}${report.statusToCheck !== undefined ? '  STATUS?' : ''}`,
      ]
    : []),
  ...(report.skipped !== undefined
    ? [`${report.id}: SKIPPED, ${report.skipped}`]
    : []),
  ...(report.moved !== undefined
    ? [
        `${report.id}: MOVED, ${report.moved.from} -> ${report.moved.to}${report.moved.rewritten ? '' : NOT_REWRITTEN}`,
      ]
    : []),
  ...report.brokenLinks.map(
    (link) => `${report.id}: BROKEN, ${link.url} (${link.reason})`,
  ),
  ...report.redirects.map(
    (link) => `${report.id}: REDIRECTS, ${link.url} -> ${link.to}`,
  ),
  ...report.notChecked.map((url) => `${report.id}: NOT CHECKED, ${url}`),
  ...report.refused.map((url) => `${report.id}: REFUSED, ${url}`),
]

const sectionOf = (title, items) => [
  `### ${title}`,
  '',
  ...(items.length === 0 ? ['None.'] : items.map((item) => `- ${item}`)),
  '',
]

// The job summary of a run (Markdown): what it moved, what it left for a
// person (a status to check, an entry not refreshed, a broken link, a link
// that redirects), how many links it had no time left to check, and how
// many its host refused to a script
/** @type {(reports: Report[]) => string} */
export const summaryOf = (reports) => {
  const statusLine = (report) =>
    report.statusToCheck.archived
      ? `\`${report.id}\`: archived on its host, \`status\` is \`${report.statusToCheck.status}\``
      : `\`${report.id}\`: not archived on its host, \`status\` is \`${report.statusToCheck.status}\``
  return [
    '## Refresh of the stats',
    '',
    `Entries read: ${reports.length} (${reports.filter((report) => report.stats !== undefined).length} from their host, ${reports.filter((report) => report.skipped !== undefined).length} skipped, ${reports.filter((report) => report.stats === undefined && report.skipped === undefined).length} with no public repository).`,
    '',
    `Links not checked, for lack of time: ${reports.flatMap((report) => report.notChecked).length}.`,
    '',
    `Links not checked, refused to a script by their host (403): ${reports.flatMap((report) => report.refused).length}.`,
    '',
    ...sectionOf(
      'Moved repositories (rewritten, unless it says otherwise)',
      reports
        .filter((report) => report.moved !== undefined)
        .map(
          (report) =>
            `\`${report.id}\`: ${report.moved.from} -> ${report.moved.to}${report.moved.rewritten ? '' : NOT_REWRITTEN}`,
        ),
    ),
    ...sectionOf(
      'Status to check (STATUS?, left unchanged)',
      reports
        .filter((report) => report.statusToCheck !== undefined)
        .map(statusLine),
    ),
    ...sectionOf(
      'Not refreshed (SKIPPED, left unchanged)',
      reports
        .filter((report) => report.skipped !== undefined)
        .map((report) => `\`${report.id}\`: ${report.skipped}`),
    ),
    ...sectionOf(
      'Broken links (left unchanged)',
      reports.flatMap((report) =>
        report.brokenLinks.map(
          (link) => `\`${report.id}\`: ${link.url} (${link.reason})`,
        ),
      ),
    ),
    ...sectionOf(
      'Links that redirect (left unchanged)',
      reports.flatMap((report) =>
        report.redirects.map(
          (link) => `\`${report.id}\`: ${link.url} -> ${link.to}`,
        ),
      ),
    ),
  ].join('\n')
}

// A host that takes longer than this to answer counts as not answering
const TIMEOUT_MS = 30_000

// How often a link is tried again when its host says to slow down (429),
// how long to wait when it does not say for how long, and the longest wait
// the run accepts: a longer one, or a `Retry-After` that is a date, reports
// the link as 429 instead, so one host cannot hold up the whole run
export const RETRIES = 3
export const RETRY_WAIT_MS = 10_000
export const MAX_RETRY_WAIT_MS = 60_000

// The network of a run, from `fetch`. Every request names the tool as its
// User-Agent. The token goes to the GitHub API only (`api.github.com`),
// never to another host or to a page. A link is fetched once a run, also
// when several entries share it, with a GET (some hosts answer no HEAD)
// whose body is not read. Each kind of request has a deadline (a time of
// `now`): a link not yet fetched at `deadlines.links` is not checked, and
// an API not yet asked at `deadlines.stats` is not asked (its entry is
// skipped), so a host that hangs never keeps the run from its end and its
// summary. The links stop first, so a slow link check never costs the
// refresh of the stats.
/** @type {(options: { fetch: (url: string, init: any) => Promise<any>, sleep: (ms: number) => Promise<unknown>, now: () => number, token?: string, deadlines: { stats: number, links: number } }) => Network} */
export const networkOf = ({ fetch, sleep, now, token, deadlines }) => {
  const askJson = async (url) => {
    const toGitHub = new URL(url).host === 'api.github.com'
    const response = await fetch(url, {
      headers: {
        Accept: toGitHub ? 'application/vnd.github+json' : 'application/json',
        'User-Agent': USER_AGENT,
        ...(toGitHub && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`${url}: ${response.status} ${response.statusText}`)
    } else {
      return response.json()
    }
  }
  const getJson = (url) =>
    now() > deadlines.stats
      ? Promise.reject(new OutOfTime('not fetched: the run ran out of time'))
      : askJson(url)
  const fetchStatus = async (url, attempt) => {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    await response.body?.cancel()
    const retryAfter = response.headers.get('retry-after')
    const wait = retryAfter === null ? RETRY_WAIT_MS : Number(retryAfter) * 1000
    if (
      response.status === 429 &&
      attempt < RETRIES &&
      wait >= 0 &&
      wait <= MAX_RETRY_WAIT_MS
    ) {
      await sleep(wait)
      return fetchStatus(url, attempt + 1)
    } else {
      return { status: response.status, url: response.url }
    }
  }
  const statuses = new Map()
  const getStatus = (url) => {
    if (!statuses.has(url)) {
      statuses.set(
        url,
        now() > deadlines.links
          ? Promise.reject(
              new OutOfTime('not checked: the link check ran out of time'),
            )
          : fetchStatus(url, 0),
      )
    }
    return statuses.get(url)
  }
  return { getJson, getStatus }
}
