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
  type Framework,
  FrameworkJson,
  type Grade,
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

// The pick of the maintainer, right after the Originator: react-tea-cup,
// the library this site is built with
const MAINTAINER_PICK = 'react-tea-cup'

// The Originator (Elm) first, then the pick of the maintainer, then the
// most starred, then by name. An entry with no GitHub repository has no
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

// The libraries that share the vocabulary of TEA but fail a hard
// requirement: the same shape as a framework, with the tier `adjacent`
export const adjacentEntries: Framework[] = pipe(
  adjacentData,
  decodeOrThrow(t.array(FrameworkJson), 'data/adjacent.json'),
  A.sort(frameworkOrd),
)

// An entry of either list, by its id (unique across both files)
export const frameworkById = (id: string): O.Option<Framework> =>
  pipe(
    [...frameworks, ...adjacentEntries],
    A.findFirst((f) => f.id === id),
  )

// The two lists of the site: the catalog of TEA frameworks, and the
// TEA-adjacent libraries
export type ListKind = 'catalog' | 'adjacent'

export const entriesOf = (kind: ListKind): Framework[] =>
  kind === 'catalog' ? frameworks : adjacentEntries

// The list an entry belongs to: where its page goes back to
export const listOf = (framework: Framework): ListKind =>
  framework.tier === 'adjacent' ? 'adjacent' : 'catalog'

const isNative = (grade: Grade): boolean => grade === 'native'

const isNativeOrManaged = (grade: Grade): boolean =>
  grade === 'native' || grade === 'managed'

// What keeps a framework from its tier (`doc/analysis.md`, section 3):
// full TEA needs Model, Msg, update and Cmd native and a native or managed
// Sub; a superset may reach Cmd and Sub in another shape (`equivalent`). A
// headless loop (no view) is allowed. Empty when it holds. An adjacent
// entry is held to full TEA, which it must fail.
export const rubricProblemsOf = (framework: Framework): string[] => {
  const { rubric } = framework
  const isSuperset = framework.tier === 'superset'
  const cmdOk = isSuperset ? rubric.cmd !== 'missing' : isNative(rubric.cmd)
  const subOk = isSuperset
    ? rubric.sub !== 'missing'
    : isNativeOrManaged(rubric.sub)
  return pipe(
    [
      O.fromPredicate(() => !isNative(rubric.model))('model is not native'),
      O.fromPredicate(() => !isNative(rubric.msg))('msg is not native'),
      O.fromPredicate(() => !isNative(rubric.update) && !isSuperset)(
        'update is not native',
      ),
      O.fromPredicate(() => !cmdOk)('cmd does not qualify'),
      O.fromPredicate(() => !subOk)('sub does not qualify'),
    ],
    A.compact,
  )
}
