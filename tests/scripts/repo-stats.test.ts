import { fc, test } from '@fast-check/vitest'
import { describe, expect, it, vi } from 'vitest'

import { adjacentEntries, frameworks } from '@/common/data/catalog'
import { type Framework, hasPublicRepo } from '@/common/type/framework'

import {
  LINK_FIELDS,
  MAX_RETRY_WAIT_MS,
  OutOfTime,
  RETRIES,
  RETRY_WAIT_MS,
  USER_AGENT,
  linesOf,
  linksOf,
  movedEntry,
  networkOf,
  refreshEntries,
  refreshEntry,
  summaryOf,
} from '../../scripts/repo-stats.mjs'

// The script runs on made-up answers of the hosts: no test reaches the
// network. Every entry comes from the data files, so the moves and links
// are checked on the real shapes of `repo`, `source` and `snippetSource`.

const allEntries = [...frameworks, ...adjacentEntries]
const publicEntries = allEntries.filter(hasPublicRepo)

const entryArb = fc.constantFrom(...allEntries)
const publicEntryArb = fc.constantFrom(...publicEntries)

// What a host says about a repository, in the fields of all three APIs at
// once (GitHub, GitLab and Gitea), each date apart so a wrong field shows
type Answer = {
  stars: number
  createdAt: string
  updatedAt: string
  archived: boolean
  fullName: string
}

const bodyOf = (answer: Answer) => ({
  stargazers_count: answer.stars,
  star_count: answer.stars,
  stars_count: answer.stars,
  created_at: `${answer.createdAt}T08:00:00Z`,
  pushed_at: `${answer.updatedAt}T09:00:00Z`,
  last_activity_at: `${answer.updatedAt}T09:00:00Z`,
  updated_at: `${answer.updatedAt}T09:00:00Z`,
  archived: answer.archived,
  full_name: answer.fullName,
  path_with_namespace: answer.fullName,
})

// The `<owner>/<name>` of a repository URL
const pathOf = (repo: string): string =>
  new URL(repo).pathname
    .split('/')
    .filter((part) => part !== '')
    .slice(0, 2)
    .join('/')

// Whether `url` is a call to the API of the host of `repo` about
// `<owner>/<name>` (teatui has the same one on Codeberg and on GitHub)
const isApiOf = (repo: string | undefined, url: string): boolean => {
  const { host } = new URL(repo ?? 'https://no.such.host')
  const apiHost = host === 'github.com' ? 'api.github.com' : host
  return (
    repo !== undefined &&
    new URL(url).host === apiHost &&
    decodeURIComponent(url).endsWith(`/${pathOf(repo)}`)
  )
}

// A host that answers `answer` for `repo` and `origin` for `originRepo`
const hostOf =
  (entry: Framework, answer: Answer, origin: Answer) => (url: string) =>
    Promise.resolve(bodyOf(isApiOf(entry.originRepo, url) ? origin : answer))

// The answer of a host that has nothing new about an entry: its numbers,
// its own address (in another case at times: the hosts ignore it), and the
// archived flag its status says
const sameAnswerOf = (entry: Framework, upper: boolean): Answer => ({
  stars: entry.stars ?? 0,
  createdAt: entry.createdAt ?? '2020-01-01',
  updatedAt: entry.updatedAt ?? '2020-01-01',
  archived: entry.status === 'archived',
  fullName: upper ? pathOf(entry.repo).toUpperCase() : pathOf(entry.repo),
})

// Every link answers 200 at its own address
const allUp = (url: string) => Promise.resolve({ status: 200, url })

const dayArb = fc
  .date({
    min: new Date('2010-01-01'),
    max: new Date('2030-12-31'),
    noInvalidDate: true,
  })
  .map((date) => date.toISOString().slice(0, 10))

const segmentArb = fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9._-]{0,12}$/)

const answerArb = (fullName: fc.Arbitrary<string>): fc.Arbitrary<Answer> =>
  fc.record({
    stars: fc.nat({ max: 300_000 }),
    createdAt: dayArb,
    updatedAt: dayArb,
    archived: fc.boolean(),
    fullName,
  })

// The fields an entry has apart from its numbers and links
const withoutNumbersAndLinks = (entry: Framework) =>
  Object.fromEntries(
    Object.entries(entry).filter(
      ([field]) =>
        !['stars', 'createdAt', 'updatedAt', ...LINK_FIELDS].includes(field),
    ),
  )

describe('refreshEntry', () => {
  test.prop([entryArb, fc.boolean()])(
    'keeps an entry as it was when its host has nothing new',
    async (entry, upper) => {
      const answer = sameAnswerOf(entry, upper)
      const { entry: refreshed, report } = await refreshEntry(
        { getJson: hostOf(entry, answer, answer), getStatus: allUp },
        entry,
      )
      expect(refreshed).toStrictEqual(entry)
      expect(report.moved).toBeUndefined()
      expect(report.statusToCheck).toBeUndefined()
      expect(report.skipped).toBeUndefined()
      expect(report.brokenLinks).toEqual([])
      expect(report.redirects).toEqual([])
      expect(report.notChecked).toEqual([])
    },
  )

  test.prop([
    publicEntryArb,
    answerArb(fc.constant('')),
    answerArb(fc.constant('')),
  ])(
    'takes the numbers of `repo`, and `createdAt` of `originRepo` when it has one',
    async (entry, answer, origin) => {
      const own = { ...answer, fullName: pathOf(entry.repo) }
      const before = {
        ...origin,
        fullName: pathOf(entry.originRepo ?? entry.repo),
      }
      const { entry: refreshed } = await refreshEntry(
        { getJson: hostOf(entry, own, before), getStatus: allUp },
        entry,
      )
      expect(refreshed).toStrictEqual({
        ...entry,
        stars: answer.stars,
        createdAt:
          entry.originRepo === undefined ? answer.createdAt : origin.createdAt,
        updatedAt: answer.updatedAt,
      })
    },
  )

  test.prop([publicEntryArb, segmentArb, segmentArb])(
    'rewrites `repo`, and every link under its old address, when the repository moved',
    async (entry, owner, name) => {
      const to = `https://${new URL(entry.repo).host}/${owner}/${name}`
      fc.pre(to.toLowerCase() !== entry.repo.replace(/\/$/, '').toLowerCase())
      const answer = {
        ...sameAnswerOf(entry, false),
        fullName: `${owner}/${name}`,
      }
      const getStatus = vi.fn(allUp)
      const { entry: refreshed, report } = await refreshEntry(
        { getJson: hostOf(entry, answer, answer), getStatus },
        entry,
      )
      const from = entry.repo.replace(/\/$/, '')
      const moveOf = (url: string | undefined) =>
        url !== undefined &&
        ['/', '?', '#'].some((separator) =>
          url.toLowerCase().startsWith(`${from.toLowerCase()}${separator}`),
        )
          ? `${to}${url.slice(from.length)}`
          : url
      expect(refreshed.repo).toBe(to)
      expect(refreshed.website).toBe(
        entry.website === undefined ? undefined : moveOf(entry.website),
      )
      expect(refreshed.source).toBe(moveOf(entry.source))
      expect(refreshed.snippetSource).toBe(moveOf(entry.snippetSource))
      expect(refreshed.originRepo).toBe(entry.originRepo)
      expect(withoutNumbersAndLinks(refreshed)).toStrictEqual(
        withoutNumbersAndLinks(entry),
      )
      expect(Object.keys(refreshed)).toEqual(Object.keys(entry))
      expect(report.moved).toEqual({ from: entry.repo, to, rewritten: true })
      // The links checked are the new ones
      expect(getStatus.mock.calls.map(([url]) => url)).toEqual(
        linksOf(refreshed),
      )
      expect(linesOf(report)).toContain(
        `${entry.id}: MOVED, ${entry.repo} -> ${to}`,
      )
    },
  )

  test.prop([publicEntryArb, fc.boolean()])(
    'reports a status that disagrees with the archived flag of the host, and keeps it',
    async (entry, archived) => {
      const answer = { ...sameAnswerOf(entry, false), archived }
      const { entry: refreshed, report } = await refreshEntry(
        { getJson: hostOf(entry, answer, answer), getStatus: allUp },
        entry,
      )
      // An author who says it is no longer maintained counts as the flag
      const disagrees =
        (archived || entry.unmaintainedNotice !== undefined) !==
        (entry.status === 'archived')
      expect(refreshed.status).toBe(entry.status)
      expect(report.statusToCheck).toEqual(
        disagrees ? { status: entry.status, archived } : undefined,
      )
      expect(linesOf(report)[0]?.endsWith('  STATUS?')).toBe(disagrees)
    },
  )

  test.prop([publicEntryArb, fc.boolean(), fc.string({ minLength: 1 })])(
    'keeps an entry its host does not answer for, and says so',
    async (entry, originOnly, message) => {
      const answer = sameAnswerOf(entry, false)
      // Only `originRepo` fails when it has one and `originOnly` is drawn
      const failing = (url: string) =>
        originOnly &&
        entry.originRepo !== undefined &&
        !isApiOf(entry.originRepo, url)
          ? hostOf(entry, answer, answer)(url)
          : Promise.reject(new Error(message))
      const { entry: refreshed, report } = await refreshEntry(
        { getJson: failing, getStatus: allUp },
        entry,
      )
      expect(refreshed).toStrictEqual(entry)
      expect(report.skipped).toBe(message)
      expect(report.stats).toBeUndefined()
      expect(linesOf(report)).toEqual([`${entry.id}: SKIPPED, ${message}`])
    },
  )

  // How a link answers: 200 at its own address (also with a trailing slash,
  // or without its anchor, which no host sees), 200 at another address, an
  // error, 403 to a script (not checked, as the page may work in a
  // browser), or not at all as the run ran out of time (`late`)
  type Outcome =
    'up' | 'slash' | 'anchorless' | 'elsewhere' | number | 'timeout' | 'late'
  test.prop([
    entryArb,
    fc.func(
      fc.oneof(
        fc.constantFrom<Outcome>('up', 'slash', 'anchorless'),
        fc.constantFrom<Outcome>(
          'elsewhere',
          403,
          404,
          410,
          429,
          500,
          'timeout',
          'late',
        ),
      ),
    ),
  ])(
    'reports every link that does not answer 200, answers at another address, was refused or was not checked, and changes none',
    async (entry, outcomeOf) => {
      const answer = sameAnswerOf(entry, false)
      const elsewhereOf = (url: string) => `${new URL(url).origin}/elsewhere`
      const getStatus = (url: string) => {
        const outcome = outcomeOf(url)
        const page = url.split('#')[0] ?? url
        return outcome === 'up'
          ? Promise.resolve({ status: 200, url })
          : outcome === 'slash'
            ? Promise.resolve({ status: 200, url: page.replace(/\/?$/, '/') })
            : outcome === 'anchorless'
              ? Promise.resolve({ status: 200, url: page })
              : outcome === 'elsewhere'
                ? Promise.resolve({ status: 200, url: elsewhereOf(url) })
                : typeof outcome === 'number'
                  ? Promise.resolve({ status: outcome, url })
                  : outcome === 'late'
                    ? Promise.reject(new OutOfTime('not checked'))
                    : Promise.reject(new Error(outcome))
      }
      const { entry: refreshed, report } = await refreshEntry(
        { getJson: hostOf(entry, answer, answer), getStatus },
        entry,
      )
      const isError = (outcome: Outcome) =>
        (typeof outcome === 'number' && outcome !== 403) ||
        outcome === 'timeout'
      expect(refreshed).toStrictEqual(entry)
      expect(report.brokenLinks).toEqual(
        linksOf(entry)
          .filter((url) => isError(outcomeOf(url)))
          .map((url) => ({ url, reason: `${outcomeOf(url)}` })),
      )
      expect(report.redirects).toEqual(
        linksOf(entry)
          .filter((url) => outcomeOf(url) === 'elsewhere')
          .map((url) => ({ url, to: elsewhereOf(url) })),
      )
      expect(report.notChecked).toEqual(
        linksOf(entry).filter((url) => outcomeOf(url) === 'late'),
      )
      expect(report.refused).toEqual(
        linksOf(entry).filter((url) => outcomeOf(url) === 403),
      )
      expect(
        linesOf(report).filter(
          (line) => !line.includes(' stars, ') && !line.includes(': SKIPPED, '),
        ),
      ).toEqual([
        ...report.brokenLinks.map(
          (link) => `${entry.id}: BROKEN, ${link.url} (${link.reason})`,
        ),
        ...report.redirects.map(
          (link) => `${entry.id}: REDIRECTS, ${link.url} -> ${link.to}`,
        ),
        ...report.notChecked.map((url) => `${entry.id}: NOT CHECKED, ${url}`),
        ...report.refused.map((url) => `${entry.id}: REFUSED, ${url}`),
      ])
    },
  )

  test.prop([entryArb])('checks every link of an entry once', async (entry) => {
    const answer = sameAnswerOf(entry, false)
    const getStatus = vi.fn(allUp)
    await refreshEntry(
      { getJson: hostOf(entry, answer, answer), getStatus },
      entry,
    )
    const links = [
      entry.repo,
      entry.website,
      entry.source,
      entry.snippetSource,
      entry.unmaintainedNotice,
    ].filter((url) => url !== undefined)
    expect(getStatus.mock.calls.map(([url]) => url).sort()).toEqual(
      [...new Set(links)].sort(),
    )
  })

  it('asks no host about an entry with no public repository', async () => {
    const fallbacks = allEntries.filter((entry) => !hasPublicRepo(entry))
    const getJson = vi.fn()
    const { entries, reports } = await refreshEntries(
      { getJson, getStatus: allUp },
      fallbacks,
    )
    expect(fallbacks.length).toBeGreaterThan(0)
    expect(getJson).not.toHaveBeenCalled()
    expect(entries).toStrictEqual(fallbacks)
    expect(reports.map(linesOf)).toEqual(fallbacks.map(() => []))
  })
})

describe('refreshEntries', () => {
  it('hands over the report of each entry as soon as it is done, in order', async () => {
    const order: string[] = []
    const getJson = (url: string) => {
      order.push(`ask ${url}`)
      return Promise.reject(new Error('down'))
    }
    const { reports } = await refreshEntries(
      { getJson, getStatus: allUp },
      publicEntries.slice(0, 3),
      (report) => order.push(`report ${report.id}`),
    )
    expect(reports.map((report) => report.id)).toEqual(
      publicEntries.slice(0, 3).map((entry) => entry.id),
    )
    expect(order.filter((step) => step.startsWith('report'))).toEqual(
      reports.map((report) => `report ${report.id}`),
    )
    expect(order.map((step) => step.split(' ')[0])).toEqual([
      'ask',
      'report',
      'ask',
      'report',
      'ask',
      'report',
    ])
  })
})

describe('the hosts', () => {
  const entryOn = (repo: string) => ({
    id: 'x',
    status: 'active',
    repo,
    stars: 1,
    createdAt: '2020-01-01',
    updatedAt: '2020-01-01',
  })
  const answer: Answer = {
    stars: 7,
    createdAt: '2021-02-03',
    updatedAt: '2024-05-06',
    archived: false,
    fullName: 'Owner/name',
  }
  // The same answer with a value of its own in each field that is not the
  // one the host reads (each case below sets the right ones), so a wrong
  // field shows
  const misleading = {
    ...bodyOf(answer),
    stargazers_count: 1,
    star_count: 2,
    stars_count: 3,
    pushed_at: '2001-01-01T00:00:00Z',
    last_activity_at: '2002-01-01T00:00:00Z',
    updated_at: '2003-01-01T00:00:00Z',
    full_name: 'Wrong/full-name',
    path_with_namespace: 'Wrong/path-with-namespace',
  }

  it.each([
    [
      'https://github.com/Owner/name',
      'https://api.github.com/repos/Owner/name',
      {
        stargazers_count: 7,
        pushed_at: '2024-05-06T09:00:00Z',
        full_name: 'Owner/name',
      },
    ],
    [
      'https://gitlab.com/Owner/name',
      'https://gitlab.com/api/v4/projects/Owner%2Fname',
      {
        star_count: 7,
        last_activity_at: '2024-05-06T09:00:00Z',
        path_with_namespace: 'Owner/name',
      },
    ],
    [
      'https://codeberg.org/Owner/name',
      'https://codeberg.org/api/v1/repos/Owner/name',
      {
        stars_count: 7,
        updated_at: '2024-05-06T09:00:00Z',
        full_name: 'Owner/name',
      },
    ],
  ])('read %s from its own API and fields', async (repo, api, fields) => {
    const getJson = vi.fn((_url: string) =>
      Promise.resolve({ ...misleading, ...fields }),
    )
    const { entry: refreshed, report } = await refreshEntry(
      { getJson, getStatus: allUp },
      entryOn(repo),
    )
    expect(getJson.mock.calls).toEqual([[api]])
    expect(refreshed).toStrictEqual({
      ...entryOn(repo),
      stars: 7,
      createdAt: '2021-02-03',
      updatedAt: '2024-05-06',
    })
    expect(report.moved).toBeUndefined()
  })

  it('follow a GitLab project that moved, by its `path_with_namespace`', async () => {
    const getJson = () =>
      Promise.resolve({
        ...misleading,
        star_count: 7,
        last_activity_at: '2024-05-06T09:00:00Z',
        path_with_namespace: 'New/place',
      })
    const { entry: refreshed, report } = await refreshEntry(
      { getJson, getStatus: allUp },
      {
        ...entryOn('https://gitlab.com/Owner/name'),
        source: 'https://gitlab.com/Owner/name/-/tree/main/core',
      },
    )
    expect(refreshed.repo).toBe('https://gitlab.com/New/place')
    expect(refreshed.source).toBe(
      'https://gitlab.com/New/place/-/tree/main/core',
    )
    expect(report.moved).toEqual({
      from: 'https://gitlab.com/Owner/name',
      to: 'https://gitlab.com/New/place',
      rewritten: true,
    })
  })

  it('report a move into a GitLab subgroup, and leave `repo` as it is', async () => {
    const getJson = () =>
      Promise.resolve({
        ...misleading,
        path_with_namespace: 'group/sub/name',
      })
    const entry = entryOn('https://gitlab.com/Owner/name')
    const { entry: refreshed, report } = await refreshEntry(
      { getJson, getStatus: allUp },
      entry,
    )
    expect(refreshed.repo).toBe('https://gitlab.com/Owner/name')
    expect(report.moved).toEqual({
      from: 'https://gitlab.com/Owner/name',
      to: 'https://gitlab.com/group/sub/name',
      rewritten: false,
    })
    expect(linesOf(report)).toContain(
      'x: MOVED, https://gitlab.com/Owner/name -> https://gitlab.com/group/sub/name (left unchanged: not an owner and a name)',
    )
  })

  test.prop([
    publicEntryArb,
    fc.constantFrom<unknown>(undefined, null, '', 42),
  ])(
    'skip an answer that names no repository, rather than read it as a move',
    async (entry, fullName) => {
      const getJson = () =>
        Promise.resolve({
          ...bodyOf(sameAnswerOf(entry, false)),
          full_name: fullName,
          path_with_namespace: fullName,
        })
      const { entry: refreshed, report } = await refreshEntry(
        { getJson, getStatus: allUp },
        entry,
      )
      expect(refreshed).toStrictEqual(entry)
      expect(report.moved).toBeUndefined()
      expect(report.skipped).toMatch(/the answer names no repository$/)
    },
  )

  it('say why a request failed, from the cause that fetch keeps', async () => {
    const failed = new Error('fetch failed', {
      cause: new Error('getaddrinfo ENOTFOUND codeberg.org'),
    })
    const { report } = await refreshEntry(
      {
        getJson: () => Promise.reject(failed),
        getStatus: () => Promise.reject(failed),
      },
      entryOn('https://codeberg.org/Owner/name'),
    )
    expect(report.skipped).toBe(
      'fetch failed: getaddrinfo ENOTFOUND codeberg.org',
    )
    expect(report.brokenLinks).toEqual([
      {
        url: 'https://codeberg.org/Owner/name',
        reason: 'fetch failed: getaddrinfo ENOTFOUND codeberg.org',
      },
    ])
  })

  it('name the tool and its repository as the User-Agent, never a person', () => {
    expect(USER_AGENT).toBe(
      'tea-ecosystem-stats (+https://github.com/rinn7e/tea-ecosystem)',
    )
  })
})

describe('movedEntry', () => {
  it('moves only the links under the old address, at a path boundary', () => {
    expect(
      movedEntry(
        {
          id: 'x',
          repo: 'https://github.com/a/b/',
          website: 'https://github.com/a/b-docs',
          source: 'https://github.com/A/B/tree/main/x',
          snippetSource: 'https://github.com/a/b#readme',
          originRepo: 'https://github.com/a/b',
        },
        'https://github.com/c/d',
      ),
    ).toStrictEqual({
      id: 'x',
      repo: 'https://github.com/c/d',
      website: 'https://github.com/a/b-docs',
      source: 'https://github.com/c/d/tree/main/x',
      snippetSource: 'https://github.com/c/d#readme',
      originRepo: 'https://github.com/a/b',
    })
  })
})

describe('summaryOf', () => {
  it('lists what the run moved and what it left for a person', () => {
    expect(
      summaryOf([
        {
          id: 'hyperapp',
          stats: {
            stars: 1,
            createdAt: '2020-01-01',
            updatedAt: '2020-01-02',
            archived: false,
          },
          moved: {
            from: 'https://github.com/jorgebucaran/hyperapp',
            to: 'https://github.com/hyperapp/hyperapp',
            rewritten: true,
          },
          brokenLinks: [{ url: 'https://example.org/gone', reason: '404' }],
          redirects: [
            {
              url: 'https://github.com/hyperapp/hyperapp/blob/master/README.md',
              to: 'https://github.com/hyperapp/hyperapp/blob/main/README.md',
            },
          ],
          notChecked: ['https://hyperapp.dev'],
          refused: ['https://www.npmjs.com/package/hyperapp'],
        },
        {
          id: 'seed',
          stats: {
            stars: 1,
            createdAt: '2020-01-01',
            updatedAt: '2020-01-02',
            archived: true,
          },
          statusToCheck: { status: 'quiet', archived: true },
          brokenLinks: [],
          redirects: [],
          notChecked: [],
          refused: [],
        },
        {
          id: 'pux',
          stats: {
            stars: 1,
            createdAt: '2020-01-01',
            updatedAt: '2020-01-02',
            archived: false,
          },
          statusToCheck: { status: 'archived', archived: false },
          moved: {
            from: 'https://gitlab.com/a/pux',
            to: 'https://gitlab.com/g/sub/pux',
            rewritten: false,
          },
          brokenLinks: [],
          redirects: [],
          notChecked: [],
          refused: [],
        },
        {
          id: 'teatui',
          skipped: 'https://codeberg.org/api/v1/repos/a/b: 502 Bad Gateway',
          brokenLinks: [],
          redirects: [],
          notChecked: [],
          refused: [],
        },
        {
          id: 'hojicha',
          brokenLinks: [],
          redirects: [],
          notChecked: [],
          refused: [],
        },
      ]),
    ).toBe(
      [
        '## Refresh of the stats',
        '',
        'Entries read: 5 (3 from their host, 1 skipped, 1 with no public repository).',
        '',
        'Links not checked, for lack of time: 1.',
        '',
        'Links not checked, refused to a script by their host (403): 1.',
        '',
        '### Moved repositories (rewritten, unless it says otherwise)',
        '',
        '- `hyperapp`: https://github.com/jorgebucaran/hyperapp -> https://github.com/hyperapp/hyperapp',
        '- `pux`: https://gitlab.com/a/pux -> https://gitlab.com/g/sub/pux (left unchanged: not an owner and a name)',
        '',
        '### Status to check (STATUS?, left unchanged)',
        '',
        '- `seed`: archived on its host, `status` is `quiet`',
        '- `pux`: not archived on its host, `status` is `archived`',
        '',
        '### Not refreshed (SKIPPED, left unchanged)',
        '',
        '- `teatui`: https://codeberg.org/api/v1/repos/a/b: 502 Bad Gateway',
        '',
        '### Broken links (left unchanged)',
        '',
        '- `hyperapp`: https://example.org/gone (404)',
        '',
        '### Links that redirect (left unchanged)',
        '',
        '- `hyperapp`: https://github.com/hyperapp/hyperapp/blob/master/README.md -> https://github.com/hyperapp/hyperapp/blob/main/README.md',
        '',
      ].join('\n'),
    )
  })

  it('says None under each heading when the run found nothing', () => {
    expect(
      summaryOf([
        {
          id: 'elm',
          brokenLinks: [],
          redirects: [],
          notChecked: [],
          refused: [],
        },
      ]),
    ).toBe(
      [
        '## Refresh of the stats',
        '',
        'Entries read: 1 (0 from their host, 0 skipped, 1 with no public repository).',
        '',
        'Links not checked, for lack of time: 0.',
        '',
        'Links not checked, refused to a script by their host (403): 0.',
        '',
        '### Moved repositories (rewritten, unless it says otherwise)',
        '',
        'None.',
        '',
        '### Status to check (STATUS?, left unchanged)',
        '',
        'None.',
        '',
        '### Not refreshed (SKIPPED, left unchanged)',
        '',
        'None.',
        '',
        '### Broken links (left unchanged)',
        '',
        'None.',
        '',
        '### Links that redirect (left unchanged)',
        '',
        'None.',
        '',
      ].join('\n'),
    )
  })
})

describe('networkOf', () => {
  // A made-up answer of `fetch`: its status, the address it ended at, and
  // its `Retry-After`
  const responseOf = (
    status: number,
    url: string,
    retryAfter: string | null = null,
  ) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: `status ${status}`,
    url,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'retry-after' ? retryAfter : null,
    },
    body: { cancel: () => Promise.resolve() },
    json: () => Promise.resolve({ asked: url }),
  })

  type Call = { url: string; headers: Record<string, string> }

  // A network on a `fetch` that answers each request with the next of
  // `answers` (at the address asked unless it names another; 200 at the
  // address asked once they run out), recording every request and every
  // wait
  const recordedNetwork = (
    options: {
      answers?: { status: number; retryAfter?: string | null; url?: string }[]
      token?: string
      now?: () => number
      deadlines?: { stats: number; links: number }
    } = {},
  ) => {
    const calls: Call[] = []
    const waits: number[] = []
    const answers = [...(options.answers ?? [])]
    const network = networkOf({
      fetch: (url: string, init: { headers: Record<string, string> }) => {
        calls.push({ url, headers: init.headers })
        const next = answers.shift()
        return Promise.resolve(
          next === undefined
            ? responseOf(200, url)
            : responseOf(next.status, next.url ?? url, next.retryAfter ?? null),
        )
      },
      sleep: (ms: number) => {
        waits.push(ms)
        return Promise.resolve()
      },
      now: options.now ?? (() => 0),
      token: options.token,
      deadlines: options.deadlines ?? { stats: 1, links: 1 },
    })
    return { network, calls, waits }
  }

  // The addresses the run asks: the API of the host of every repository,
  // and every link of the data
  const apiUrlArb = fc.constantFrom(
    ...publicEntries.flatMap((entry) => {
      const { host } = new URL(entry.repo)
      const path = pathOf(entry.repo)
      return host === 'github.com'
        ? [`https://api.github.com/repos/${path}`]
        : [`https://${host}/api/v1/repos/${path}`]
    }),
    'https://gitlab.com/api/v4/projects/Owner%2Fname',
  )
  const linkArb = fc.constantFrom(...allEntries.flatMap(linksOf))

  test.prop([apiUrlArb, linkArb, fc.option(fc.string({ minLength: 1 }))])(
    'send the token to the GitHub API only, and the User-Agent on every request',
    async (api, link, token) => {
      const { network, calls } = recordedNetwork({
        token: token ?? undefined,
      })
      await network.getJson(api)
      await network.getStatus(link)
      const toGitHubApi = new URL(api).host === 'api.github.com'
      expect(calls.map((call) => call.headers['User-Agent'])).toEqual([
        USER_AGENT,
        USER_AGENT,
      ])
      expect(calls[0]?.headers.Authorization).toBe(
        toGitHubApi && token !== null ? `Bearer ${token}` : undefined,
      )
      expect(calls[1]?.headers.Authorization).toBeUndefined()
    },
  )

  it('give the address a link ends at after its redirects', async () => {
    const { network } = recordedNetwork({
      answers: [
        {
          status: 200,
          url: 'https://github.com/a/b/blob/main/README.md',
        },
      ],
    })
    expect(
      await network.getStatus('https://github.com/a/b/blob/master/README.md'),
    ).toEqual({
      status: 200,
      url: 'https://github.com/a/b/blob/main/README.md',
    })
  })

  it('throw for an API answer that is not ok, with its status', async () => {
    const { network } = recordedNetwork({ answers: [{ status: 404 }] })
    await expect(
      network.getJson('https://api.github.com/repos/a/b'),
    ).rejects.toThrow('https://api.github.com/repos/a/b: 404 status 404')
  })

  it.each([
    ['no Retry-After', [{ status: 429 }], [RETRY_WAIT_MS], 200],
    ['Retry-After in seconds', [{ status: 429, retryAfter: '5' }], [5000], 200],
    [
      'a Retry-After longer than the run accepts',
      [{ status: 429, retryAfter: `${MAX_RETRY_WAIT_MS / 1000 + 1}` }],
      [],
      429,
    ],
    [
      'a Retry-After that is a date',
      [{ status: 429, retryAfter: 'Wed, 21 Oct 2026 07:28:00 GMT' }],
      [],
      429,
    ],
    [
      'a host that keeps saying 429',
      Array.from({ length: RETRIES + 1 }, () => ({
        status: 429,
        retryAfter: '1',
      })),
      Array.from({ length: RETRIES }, () => 1000),
      429,
    ],
  ])(
    'try a link again after a 429 with %s',
    async (_case, answers, waits, status) => {
      const { network, waits: waited } = recordedNetwork({ answers })
      expect(await network.getStatus('https://example.org/a')).toEqual({
        status,
        url: 'https://example.org/a',
      })
      expect(waited).toEqual(waits)
    },
  )

  test.prop([
    fc.array(
      fc.record({
        status: fc.constantFrom(200, 404, 429),
        retryAfter: fc.option(
          fc.constantFrom('0', '1', '60', '61', '3600', 'soon'),
        ),
      }),
    ),
  ])(
    'never try a link more than the retries allow, nor wait longer than the run accepts',
    async (answers) => {
      const { network, calls, waits } = recordedNetwork({ answers })
      await network.getStatus('https://example.org/a')
      expect(calls.length).toBeLessThanOrEqual(RETRIES + 1)
      expect(waits.every((ms) => ms >= 0 && ms <= MAX_RETRY_WAIT_MS)).toBe(true)
    },
  )

  test.prop([fc.array(linkArb, { minLength: 1 })])(
    'fetch each link once a run, also when several entries share it',
    async (links) => {
      const { network, calls } = recordedNetwork()
      for (const link of links) {
        expect(await network.getStatus(link)).toEqual({
          status: 200,
          url: link,
        })
      }
      expect(calls.map((call) => call.url).sort()).toEqual(
        [...new Set(links)].sort(),
      )
    },
  )

  it('stop checking links at their deadline, and asking APIs at theirs', async () => {
    const clock = { time: 0 }
    const { network, calls } = recordedNetwork({
      now: () => clock.time,
      deadlines: { links: 10, stats: 20 },
    })
    await network.getStatus('https://example.org/early')
    clock.time = 11
    await expect(network.getStatus('https://example.org/late')).rejects.toThrow(
      new OutOfTime('not checked: the link check ran out of time'),
    )
    expect(await network.getStatus('https://example.org/early')).toEqual({
      status: 200,
      url: 'https://example.org/early',
    })
    expect(await network.getJson('https://api.github.com/repos/a/b')).toEqual({
      asked: 'https://api.github.com/repos/a/b',
    })
    clock.time = 21
    await expect(
      network.getJson('https://api.github.com/repos/c/d'),
    ).rejects.toThrow(new OutOfTime('not fetched: the run ran out of time'))
    expect(calls.map((call) => call.url)).toEqual([
      'https://example.org/early',
      'https://api.github.com/repos/a/b',
    ])
  })

  it('skip an entry, and count its links as not checked, once the run is out of time', async () => {
    const { network } = recordedNetwork({
      now: () => 100,
      deadlines: { links: 10, stats: 20 },
    })
    const entry = publicEntries[0]
    const { entry: refreshed, report } = await refreshEntry(network, entry)
    expect(refreshed).toStrictEqual(entry)
    expect(report.skipped).toBe('not fetched: the run ran out of time')
    expect(report.brokenLinks).toEqual([])
    expect(report.notChecked).toEqual(linksOf(entry))
  })
})
