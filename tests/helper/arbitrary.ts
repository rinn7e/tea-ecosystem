import { fc } from '@fast-check/vitest'
import * as O from 'fp-ts/Option'
import { isDeepStrictEqual } from 'node:util'

import {
  type ListId,
  adjacentEntries,
  frameworks,
  targetOptionsOf,
} from '@/common/data/catalog'
import {
  type AdjacentFilter,
  type CatalogFilter,
  type Choice,
  type EntryCategory,
  type ListingFilter,
  type ListingSort,
  type StatusChoice,
  anyChoice,
  catalogTiers,
  choiceOf,
  defaultStatusChoice,
  lackables,
  sortColumns,
  statusChoiceOf,
} from '@/common/type/destination'
import {
  type Concept,
  type Target,
  type Tier,
  languagesOf,
  statuses,
} from '@/common/type/framework'

// Random filters for the property tests. Every value is built the way the
// app builds it (`choiceOf`, `statusChoiceOf`), so only states the app can
// be in come out, every box ticked and none ticked included. Each field
// keeps its default two times in three (`orDefault`), so a filter that
// differs from the default in one field alone comes out often too.

const orDefault = <A>(fallback: A, arb: fc.Arbitrary<A>): fc.Arbitrary<A> =>
  fc.oneof(
    { arbitrary: fc.constant(fallback), weight: 2 },
    { arbitrary: arb, weight: 1 },
  )

// A choice among `options`: no box ticked and every box ticked come out as
// often as a part of them
export const choiceArb = <A extends string>(
  options: readonly A[],
): fc.Arbitrary<Choice<A>> =>
  fc
    .oneof(
      fc.constant<A[]>([]),
      fc.constant([...options]),
      fc.subarray([...options]),
    )
    .map((chosen) => choiceOf(options, chosen))

export const statusChoiceArb: fc.Arbitrary<StatusChoice> = fc
  .subarray([...statuses])
  .map(statusChoiceOf)

// Searches that match many entries, a few, one or none, with spaces
// around some
const queryArb = fc.constantFrom(
  '',
  ' ',
  'rust',
  ' elm ',
  'seed',
  'redux',
  'xstate',
  'tea',
  'no such framework',
)

// Every language of the data, each of a pair alone too, and one that no
// entry is written in
const languageArb = fc.option(
  fc.constantFrom(
    'Cobol',
    ...new Set(
      [...frameworks, ...adjacentEntries].flatMap((f) => [
        f.language,
        ...languagesOf(f),
      ]),
    ),
  ),
  { nil: undefined },
)

export const sortRecordArb = fc.record<ListingSort>(
  {
    column: fc.constantFrom(...sortColumns),
    direction: fc.constantFrom('ascending', 'descending'),
  },
  { noNullPrototype: true },
)

const sortArb = fc.option(sortRecordArb, { nil: undefined })

// The filters both lists have, the targets among the ones `list` offers
const sharedArb = (list: ListId) =>
  fc.record(
    {
      targets: orDefault(
        anyChoice<Target>(false),
        choiceArb(targetOptionsOf(list)),
      ),
      statuses: orDefault(defaultStatusChoice(), statusChoiceArb),
      query: orDefault('', queryArb),
      language: orDefault(undefined, languageArb).map(O.fromNullable),
      layout: orDefault<'cards' | 'table'>('cards', fc.constant('table')),
      sort: orDefault(undefined, sortArb).map(O.fromNullable),
    },
    { noNullPrototype: true },
  )

export const catalogFilterArb: fc.Arbitrary<CatalogFilter> = fc
  .tuple(
    sharedArb('catalog'),
    orDefault(anyChoice<Tier>(false), choiceArb(catalogTiers)),
    orDefault(
      undefined,
      fc.constantFrom<EntryCategory>('languages', 'frameworks'),
    ),
  )
  .map(([shared, tiers, show]) => ({
    ...shared,
    list: 'catalog',
    tiers,
    show: O.fromNullable(show),
  }))

export const adjacentFilterArb: fc.Arbitrary<AdjacentFilter> = fc
  .tuple(
    sharedArb('adjacent'),
    orDefault(anyChoice<Concept>(false), choiceArb(lackables)),
  )
  .map(([shared, lacks]) => ({ ...shared, list: 'adjacent', lacks }))

export const listingFilterArb: fc.Arbitrary<ListingFilter> = fc.oneof(
  catalogFilterArb,
  adjacentFilterArb,
)

// Two values for a law of equality: two equal values built apart
// (`fc.clone`, so an `Eq` that compares by reference fails), a value and
// the same with one field taken from another value where they differ, or
// two values drawn apart
export const pairArb = <A extends object>(
  arb: fc.Arbitrary<A>,
): fc.Arbitrary<[A, A]> =>
  fc.oneof(
    fc.clone(arb, 2).map(([x, y]): [A, A] => [x, y]),
    fc
      .tuple(fc.clone(arb, 2), arb, fc.nat())
      .map(([[x, copy], y, pick]) => {
        const keys = Object.keys(x).filter((key) => key in y)
        return { x, copy, y, key: keys[pick % keys.length] }
      })
      .filter(
        ({ x, y, key }) =>
          key !== undefined &&
          !isDeepStrictEqual(Reflect.get(x, key), Reflect.get(y, key)),
      )
      .map(({ x, copy, y, key }): [A, A] => [
        x,
        { ...copy, [key ?? '']: Reflect.get(y, key ?? '') },
      ]),
    fc.tuple(arb, arb),
  )
