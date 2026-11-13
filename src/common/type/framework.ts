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
// effects run inside update), or not at all
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

export const StatusJson: t.Type<Status> = t.keyof({
  active: null,
  quiet: null,
  archived: null,
})

export type Framework = {
  // Its URL segment: `/framework/<id>`
  id: string
  name: string
  language: string
  // Elm itself and the languages forked from it or built on its runtime
  elmFamily: boolean
  targets: Target[]
  tier: Tier
  status: Status
  url: string
  // Its public repository, as a full URL on any host (GitHub, GitLab,
  // Codeberg or another Gitea): where its stars and dates come from. Absent
  // when its source is not public.
  repo?: string
  // Where the project lived before it moved (Tyrian and Indigo moved into
  // one monorepo in 2025, teatui to Codeberg): its `createdAt` comes from
  // here
  originRepo?: string
  // Its own logo, a file in `public/logo/`. Absent when it has none: a
  // monogram stands in.
  logo?: string
  // A logo made of text, for a project whose mark is an emoji or a glyph
  // in its title (react-tea-cup: a cup of tea), used when it has no `logo`
  logoText?: string
  // The star count of `repo`, and the day its repository was created and
  // last pushed to (`YYYY-MM-DD`), filled by `scripts/fetch-repo-stats.mjs`
  stars?: number
  createdAt?: string
  updatedAt?: string
  summary: string
  // Where its example (`data/snippet/<id>.<extension>`) was copied from:
  // its own README, docs or examples. Absent when it has no example.
  snippetSource?: string
  rubric: Rubric
  notes: string[]
  // Whether every grade was checked against its docs or source. The first
  // list was graded from memory and a light web check.
  verified: boolean
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
    url: t.string,
    summary: t.string,
    rubric: RubricJson,
    notes: t.array(t.string),
    verified: t.boolean,
  }),
  t.partial({
    repo: t.string,
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

// Where its source lives: its repository, else its own page (a package
// registry for the few whose source is not public)
export const sourceUrlOf = (framework: Framework): string =>
  framework.repo ?? framework.url
