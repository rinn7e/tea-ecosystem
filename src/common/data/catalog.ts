import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import { concatAll } from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import * as Ord from 'fp-ts/Ord'
import * as B from 'fp-ts/boolean'
import { pipe } from 'fp-ts/function'
import * as N from 'fp-ts/number'
import * as S from 'fp-ts/string'
import * as t from 'io-ts'
import { PathReporter } from 'io-ts/PathReporter'

import {
  type Concept,
  type Framework,
  FrameworkJson,
  type Grade,
  type Target,
  languagesOf,
  targets,
} from '@/common/type/framework'

import adjacentData from '../../../data/adjacent.json'
import frameworkData from '../../../data/frameworks.json'

// The data files are checked by the tests in CI, so a file that does not
// decode never ships: failing here at load is that check, not a fallback
export const decodeOrThrow =
  <A>(codec: t.Type<A>, fileName: string) =>
  (data: unknown): A =>
    pipe(
      codec.decode(data),
      E.getOrElse((): A => {
        throw new Error(
          `${fileName}: ${PathReporter.report(codec.decode(data)).join('; ')}`,
        )
      }),
    )

// react-tea-cup, the library this site is built with
const MAINTAINER_PICK = 'react-tea-cup'

// The Originator (Elm) first, then the pick of the maintainer, then the
// most starred, then by name. An entry with no public repository has no
// stars and comes last.
const frameworkOrd: Ord.Ord<Framework> = concatAll(Ord.getMonoid<Framework>())([
  pipe(
    Ord.reverse(B.Ord),
    Ord.contramap((f: Framework) => f.tier === 'reference'),
  ),
  pipe(
    Ord.reverse(B.Ord),
    Ord.contramap((f: Framework) => f.id === MAINTAINER_PICK),
  ),
  pipe(
    Ord.reverse(N.Ord),
    Ord.contramap((f: Framework) => f.stars ?? -1),
  ),
  pipe(
    S.Ord,
    Ord.contramap((f: Framework) => f.name.toLowerCase()),
  ),
])

export const frameworks: Framework[] = pipe(
  frameworkData,
  decodeOrThrow(t.array(FrameworkJson), 'data/frameworks.json'),
  A.sort(frameworkOrd),
)

export const adjacentEntries: Framework[] = pipe(
  adjacentData,
  decodeOrThrow(t.array(FrameworkJson), 'data/adjacent.json'),
  A.sort(frameworkOrd),
)

// Ids are unique across both files
export const frameworkById = (id: string): O.Option<Framework> =>
  pipe(
    [...frameworks, ...adjacentEntries],
    A.findFirst((f) => f.id === id),
  )

export type ListId = 'catalog' | 'adjacent'

export const entriesOf = (list: ListId): Framework[] =>
  list === 'catalog' ? frameworks : adjacentEntries

// The options of the target filter of a list, so TEA-adjacent, which has no
// game library, offers no game target
export const targetOptionsOf = (list: ListId): Target[] =>
  pipe(
    [...targets],
    A.filter((target) =>
      pipe(
        entriesOf(list),
        A.some((f) => A.elem(S.Eq)(target)(f.targets)),
      ),
    ),
  )

// Where the page of an entry goes back to
export const listOf = (framework: Framework): ListId =>
  framework.tier === 'adjacent' ? 'adjacent' : 'catalog'

// Other entries count when they share any of the two languages of an entry
// that ships one library per platform, as the language filter matches. The
// page of an entry shows them
// under "More in <language>", so a Haskell framework also points to the
// Haskell libraries that are not TEA, and back.
export const sameLanguageEntriesOf = (
  framework: Framework,
): { list: ListId; entries: Framework[] }[] =>
  pipe(
    ['catalog', 'adjacent'] satisfies ListId[],
    A.map((list) => ({
      list,
      entries: pipe(
        entriesOf(list),
        A.filter(
          (f) =>
            f.id !== framework.id &&
            pipe(
              languagesOf(f),
              A.some((language) =>
                A.elem(S.Eq)(language)(languagesOf(framework)),
              ),
            ),
        ),
      ),
    })),
    A.filter(({ entries }) => entries.length > 0),
  )

// The hard requirements of the rubric (`doc/analysis.md`, section 3), in
// the order of `concepts`, which is the order the "Misses ...: " prefix of
// a TEA-adjacent note lists them in. View
// and Ports are graded but never required, so a headless loop (no view) is
// allowed.
export const requirements: readonly Concept[] = [
  'model',
  'msg',
  'update',
  'cmd',
  'sub',
]

// `equivalent` (the same power in another shape) describes a part and
// never meets a requirement, so a program ports back to Elm in the same
// shape.
export const meetsRequirement =
  (concept: Concept) =>
  (grade: Grade): boolean =>
    grade === 'native' || (concept === 'sub' && grade === 'managed')

// No missed requirement for an entry of the catalog, at least one for a
// TEA-adjacent library
export const missedRequirementsOf = (framework: Framework): Concept[] =>
  pipe(
    [...requirements],
    A.filter(
      (concept) => !meetsRequirement(concept)(framework.rubric[concept]),
    ),
  )

// A requirement as notes and docs write it: the type names (Model, Msg,
// Cmd, Sub) capitalized, the function `update` not
const requirementLabel = (concept: Concept): string =>
  concept === 'update'
    ? 'update'
    : concept === 'msg'
      ? 'Msg'
      : `${concept.charAt(0).toUpperCase()}${concept.slice(1)}`

const listText = (labels: string[]): string =>
  pipe(
    labels,
    A.matchRight(
      () => '',
      (init, last) =>
        A.isEmpty(init)
          ? last
          : `${pipe(init, A.intercalate(S.Monoid)(', '))} and ${last}`,
    ),
  )

// The word every first note of a TEA-adjacent library starts with
export const MISSES_NOTE_PREFIX = 'Misses '

export const missesNotePrefixOf = (framework: Framework): string =>
  `${MISSES_NOTE_PREFIX}${pipe(missedRequirementsOf(framework), A.map(requirementLabel), listText)}: `

// How the note of a superset that names what it adds beyond TEA starts
export const SUPERSET_NOTE_PREFIX = 'Superset: '

const namesBeyondTea = (framework: Framework): boolean =>
  pipe(
    framework.notes,
    A.some((note) => note.startsWith(SUPERSET_NOTE_PREFIX)),
  )

const stopsAt =
  (prefix: string) =>
  (note: string): boolean =>
    note.startsWith(prefix) && note.slice(prefix.length).trim() === ''

const tierRuleProblemsOf = (framework: Framework): string[] => {
  const missed = missedRequirementsOf(framework)
  const missedProblems = pipe(
    missed,
    A.map((concept) => `misses ${requirementLabel(concept)}`),
  )
  switch (framework.tier) {
    case 'reference':
    case 'full':
      return [
        ...missedProblems,
        ...(namesBeyondTea(framework)
          ? ['names something beyond TEA, so it is a superset']
          : []),
      ]
    case 'superset':
      return [
        ...missedProblems,
        ...(namesBeyondTea(framework)
          ? []
          : [`names nothing beyond TEA in a "${SUPERSET_NOTE_PREFIX}" note`]),
      ]
    case 'adjacent': {
      const prefix = missesNotePrefixOf(framework)
      return missed.length === 0
        ? ['meets every requirement of full TEA']
        : pipe(
            A.head(framework.notes),
            O.getOrElse(() => ''),
            (note) =>
              !note.startsWith(prefix)
                ? [`its first note does not start "${prefix}"`]
                : stopsAt(prefix)(note)
                  ? [`gives no reason after "${note.trim()}"`]
                  : [],
          )
    }
  }
}

// What keeps an entry from its tier (`doc/analysis.md`, section 3). Every
// tier of the catalog needs all the requirements of full TEA: a superset
// is full TEA plus something beyond it (components with a loop of their
// own, server-side rendering, a server loop), named in a note that starts
// with "Superset: ", and an entry with nothing beyond TEA is full TEA. A
// TEA-adjacent library misses at least one requirement, and its first note
// says which and why. A "Superset: " note that stops at its prefix gives
// no reason, a problem on any tier, and so does a first note of a
// TEA-adjacent library that stops at its "Misses ...: " prefix.
export const rubricProblemsOf = (framework: Framework): string[] => [
  ...tierRuleProblemsOf(framework),
  ...pipe(
    framework.notes,
    A.filter(stopsAt(SUPERSET_NOTE_PREFIX)),
    A.map((note) => `gives no reason after "${note.trim()}"`),
  ),
]
