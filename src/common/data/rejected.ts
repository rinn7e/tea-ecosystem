import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'
import { flow, pipe } from 'fp-ts/function'
import * as S from 'fp-ts/string'
import * as t from 'io-ts'

import { decodeOrThrow } from '@/common/data/catalog'
import {
  FIRST_LIST_DAY,
  type Framework,
  sourceUrlOf,
} from '@/common/type/framework'
import { type Rejection, RejectionJson } from '@/common/type/rejected'

import rejectedData from '../../../data/rejected.json'

// The projects a person turned down, which the weekly search never
// proposes again (`.github/discover-prompt.md`)
export const rejections: Rejection[] = pipe(
  rejectedData,
  decodeOrThrow(t.array(RejectionJson), 'data/rejected.json'),
)

// A URL as a key that two spellings of one address share: no scheme, no
// `www.`, no `.git` or slash at the end, in lower case (the hosts of the
// data read owner and name in any case)
export const repoKeyOf = (url: string): string =>
  url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/, '')

// The addresses an entry is listed under: its source (its directory in a
// monorepo or its reference page, else its repository) and where it lived
// before it moved. The repository of an entry that is one part of it is
// not one: React may be turned down while `useReducer`, listed by its
// reference page, stays listed.
export const listedKeysOf = (framework: Framework): string[] =>
  pipe(
    [sourceUrlOf(framework), framework.originRepo],
    A.filterMap(flow(O.fromNullable, O.map(repoKeyOf))),
  )

// The rejections that name an entry of the lists: a project is either
// listed or turned down, never both (test "never turn down a listed
// entry")
export const listedRejectionsOf = (
  rejected: Rejection[],
  entries: Framework[],
): Rejection[] =>
  pipe(
    rejected,
    A.filter((rejection) =>
      pipe(
        entries,
        A.chain(listedKeysOf),
        A.elem(S.Eq)(repoKeyOf(rejection.repo)),
      ),
    ),
  )

// What keeps a rejection from the rules of `data/rejected.json`: its
// repository a full URL of owner and name, its day a day of the catalog,
// its reason a sentence of plain ASCII. Empty when it holds (tests "give
// every rejected repository as a full URL of owner and name" and "give
// every rejection its day and a reason in plain ASCII").
export const rejectionProblemsOf = (rejection: Rejection): string[] =>
  pipe(
    [
      O.fromPredicate(
        () => !/^https:\/\/[a-z0-9.-]+\/[^/\s]+\/[^/\s]+$/.test(rejection.repo),
      )('repo is not a full URL of owner and name'),
      O.fromPredicate(
        () =>
          !/^\d{4}-\d{2}-\d{2}$/.test(rejection.rejectedAt) ||
          rejection.rejectedAt < FIRST_LIST_DAY,
      )('rejectedAt is not a day of the catalog'),
      O.fromPredicate(() => !/^[\x20-\x7e]+$/.test(rejection.reason.trim()))(
        'reason is not a sentence of plain ASCII',
      ),
    ],
    A.compact,
  )
