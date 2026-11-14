import * as t from 'io-ts'

// The parts of The Elm Architecture a framework is graded on
// (`doc/analysis.md`, section 3)
export type Concept =
  'model' | 'msg' | 'update' | 'view' | 'cmd' | 'sub' | 'ports'

export const concepts: readonly Concept[] = [
  'model',
  'msg',
  'update',
  'view',
  'cmd',
  'sub',
  'ports',
]

export const ConceptJson: t.Type<Concept> = t.keyof({
  model: null,
  msg: null,
  update: null,
  view: null,
  cmd: null,
  sub: null,
  ports: null,
})

// How a framework has a concept: in the shape of TEA (`native`), as a
// long-running source the runtime manages (`managed`, for subscriptions
// and ports), with the same power in another shape (`equivalent`, such as
// effects run inside update, which describes a part and never meets a
// requirement of a tier: `meetsRequirement`), or not at all
export type Grade = 'native' | 'managed' | 'equivalent' | 'missing'

export const GradeJson: t.Type<Grade> = t.keyof({
  native: null,
  managed: null,
  equivalent: null,
  missing: null,
})

export type Rubric = {
  model: Grade
  msg: Grade
  update: Grade
  view: Grade
  cmd: Grade
  sub: Grade
  ports: Grade
}

export const RubricJson: t.Type<Rubric> = t.type({
  model: GradeJson,
  msg: GradeJson,
  update: GradeJson,
  view: GradeJson,
  cmd: GradeJson,
  sub: GradeJson,
  ports: GradeJson,
})

// `reference` is Elm itself, shown as Originator. `adjacent` is a library
// that shares the vocabulary but fails a hard requirement: the entries of
// `data/adjacent.json`.
export type Tier = 'reference' | 'full' | 'superset' | 'adjacent'

export const TierJson: t.Type<Tier> = t.keyof({
  reference: null,
  full: null,
  superset: null,
  adjacent: null,
})

export type Target =
  'web' | 'ssr' | 'server' | 'desktop' | 'mobile' | 'tui' | 'game'

export const targets: readonly Target[] = [
  'web',
  'ssr',
  'server',
  'desktop',
  'mobile',
  'tui',
  'game',
]

export const TargetJson: t.Type<Target> = t.keyof({
  web: null,
  ssr: null,
  server: null,
  desktop: null,
  mobile: null,
  tui: null,
  game: null,
})

export type Status = 'active' | 'quiet' | 'archived'

export const statuses: readonly Status[] = ['active', 'quiet', 'archived']

export const StatusJson: t.Type<Status> = t.keyof({
  active: null,
  quiet: null,
  archived: null,
})

export type Framework = {
  // Its URL segment: `/framework/<id>` (tests "give every entry a unique
  // id, across both files" and "use ids that are readable URL segments")
  id: string
  name: string
  // One language, or two joined by " and " (`languagesOf`), each with a
  // logo (test "has a logo for every language of the data")
  language: string
  // Elm itself and the languages forked from it or built on its runtime
  elmFamily: boolean
  targets: Target[]
  // Held to the rules of the rubric, `adjacent` only in `data/adjacent.json`
  // (tests "keep every framework within the rules of its tier" and "keep
  // every adjacent entry failing the rubric, so it is not TEA")
  tier: Tier
  status: Status
  // Its repository, as a full URL of owner and name on any host (GitHub,
  // GitLab, Codeberg or another Gitea): where its source links go, and
  // where its stars and dates come from. When its source is not public,
  // it falls back to its website, and `website` holds the same URL, which
  // is how `hasPublicRepo` tells the two apart (tests "give every
  // repository as a full URL of owner and name" and "fall back to the
  // website as repo only for the entries with no public source").
  repo: string
  // Its own website or docs, apart from its repository (sky-lang.org for
  // Sky), shown under the summary of its page when it is not its source.
  // Absent when the repository is all it has.
  website?: string
  // Where its source links go instead of the root of `repo`: the full URL
  // of its directory inside `repo`, for an entry that is one package of a
  // monorepo (Oak in the repository of the Monad language, @xstate/store
  // beside XState), or its own reference page (`website`), for one that is
  // a single function of a bigger library (useReducer in React) (test
  // "give the source of an entry inside its repository, or as its own
  // page")
  source?: string
  // Where the project lived before it moved (Tyrian and Indigo moved into
  // one monorepo in 2025, teatui to Codeberg): its `createdAt` comes from
  // here (test "give every repository as a full URL of owner and name")
  originRepo?: string
  // Its own logo, a file in `public/logo/`. Absent when it has none: a
  // monogram stands in (test "name a logo file that exists in
  // public/logo").
  logo?: string
  // A logo made of text, for a project whose mark is an emoji or a glyph
  // in its title (react-tea-cup: a cup of tea), used when it has no `logo`
  logoText?: string
  // The star count of `repo`, and the day its repository was created and
  // last pushed to (`YYYY-MM-DD`), filled by `scripts/fetch-repo-stats.mjs`;
  // present for every public repository (test "give every repository its
  // stars and both dates, as days")
  stars?: number
  createdAt?: string
  updatedAt?: string
  summary: string
  // Where its example (`data/snippet/<id>.<extension>`) was copied from:
  // its own README, docs or examples. Absent when it has no example (test
  // "give every example its source, and every source its example").
  snippetSource?: string
  rubric: Rubric
  // What the grades leave out. A superset names what it adds beyond TEA in
  // a note that starts with "Superset: ", and a TEA-adjacent library starts
  // its notes with the requirements it misses ("Misses Cmd and Sub: ...")
  // (`rubricProblemsOf`, tests "keep every framework within the rules of
  // its tier" and "keep every adjacent entry failing the rubric, so it is
  // not TEA")
  notes: string[]
  // Whether every grade was checked against its docs or source. The first
  // list was graded from memory and a light web check.
  verified: boolean
  // The day it was added to this catalog (`YYYY-MM-DD`): the first list
  // (`FIRST_LIST_DAY`), or the day a later search found it (test "give
  // every entry the day it was added, not before the first list")
  discoveredAt: string
}

export const FrameworkJson: t.Type<Framework> = t.intersection([
  t.type({
    id: t.string,
    name: t.string,
    language: t.string,
    elmFamily: t.boolean,
    targets: t.array(TargetJson),
    tier: TierJson,
    status: StatusJson,
    repo: t.string,
    summary: t.string,
    rubric: RubricJson,
    notes: t.array(t.string),
    verified: t.boolean,
    discoveredAt: t.string,
  }),
  t.partial({
    website: t.string,
    source: t.string,
    originRepo: t.string,
    logo: t.string,
    logoText: t.string,
    stars: t.number,
    snippetSource: t.string,
    createdAt: t.string,
    updatedAt: t.string,
  }),
])

// The languages an entry is written in: one, or two for an entry that
// ships one library per platform ("Kotlin and Swift")
export const languagesOf = (framework: Framework): string[] =>
  framework.language.split(' and ')

// An entry that is a language of its own (Elm, Gren), not a framework
// written in one: its tile shows the language logo, and its language line
// shows no logo a second time
export const isLanguageEntry = (framework: Framework): boolean =>
  framework.name === framework.language

// The site of a URL, without `www.`: `sky-lang.org`
export const hostOf = (url: string): string =>
  new URL(url).host.replace(/^www\./, '')

// Two URLs that name the same page, with or without a slash at the end
const isSameUrl = (a: string, b: string | undefined): boolean =>
  b !== undefined && a.replace(/\/$/, '') === b.replace(/\/$/, '')

// Whether its source is public: its `repo` is a repository, not the
// website it falls back to, which the data marks by giving `website` the
// same URL. Only then does it have stars and dates.
export const hasPublicRepo = (framework: Framework): boolean =>
  !isSameUrl(framework.repo, framework.website)

// Where its source lives: its directory in a monorepo or its reference
// page (`source`), else its repository (the website of an entry whose
// source is not public). The star button and the source link of its page
// both open it.
export const sourceUrlOf = (framework: Framework): string =>
  framework.source ?? framework.repo

// The source as its link reads: the host and the repository
// (`github.com/lustre-labs/lustre`), then the directory of a monorepo
// entry after a dot (`github.com/monad-lang/monad · motes/oak`); the host
// alone for an entry whose source is not public
export const sourceLabelOf = (framework: Framework): string => {
  // The host and the path of a URL: `github.com/lustre-labs/lustre`
  const addressOf = (url: string): string =>
    `${hostOf(url)}${new URL(url).pathname.replace(/\/$/, '')}`
  const directoryOf = (repo: string, source: string): string =>
    source
      .slice(repo.length)
      .replace(/^\/(-\/)?(tree|blob|src\/branch)\/[^/]+\//, '')
      .replace(/\/$/, '')
  return !hasPublicRepo(framework)
    ? hostOf(framework.repo)
    : framework.source === undefined
      ? addressOf(framework.repo)
      : framework.source.startsWith(`${framework.repo}/`)
        ? `${addressOf(framework.repo)} · ${directoryOf(framework.repo, framework.source)}`
        : addressOf(framework.source)
}

// Its own website or docs, when it has one that is not its source: the
// page links to it under its summary. None when `website` is absent, or is
// the address its source link already opens (an entry with no public
// source, or useReducer, whose source is its reference page).
export const websiteOf = (framework: Framework): string | undefined =>
  framework.website === undefined ||
  isSameUrl(framework.website, framework.repo) ||
  isSameUrl(framework.website, framework.source)
    ? undefined
    : framework.website

export const websiteLabelOf = (url: string): string => hostOf(url)

// The day of the first list of the catalog, the one of its launch: an
// entry found after it is new
export const FIRST_LIST_DAY = '2026-11-13'

// How long an entry found after the first list shows as recently added
export const RECENT_DAYS = 30

// The first day that still counts as recent at `now` (ms since 1970), in
// the local days of the reader, as `discoveredAt` is a local day. A day, not
// a time, so a view that takes it is drawn again once a day, not every
// minute.
export const recentSinceOf = (now: number): string => {
  const today = new Date(now)
  const since = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - RECENT_DAYS,
  )
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${since.getFullYear()}-${pad(since.getMonth() + 1)}-${pad(since.getDate())}`
}

// Found after the first list, and not longer ago than `RECENT_DAYS`: its
// card and its page show the ribbon "Recently added" (the table shows the
// day in its Added column instead)
export const isRecentlyAdded = (
  framework: Framework,
  recentSince: string,
): boolean =>
  framework.discoveredAt > FIRST_LIST_DAY &&
  framework.discoveredAt >= recentSince
