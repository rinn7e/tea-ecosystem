import { fc } from '@fast-check/vitest'
import * as O from 'fp-ts/Option'

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

// A choice among `options`: any part of them, none or every one too
export const choiceArb = <A extends string>(
  options: readonly A[],
): fc.Arbitrary<Choice<A>> =>
  fc.subarray([...options]).map((chosen) => choiceOf(options, chosen))

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

const sortArb = fc.option(
  fc.record<ListingSort>(
    {
      column: fc.constantFrom(...sortColumns),
      direction: fc.constantFrom('ascending', 'descending'),
    },
    { noNullPrototype: true },
  ),
  { nil: undefined },
)

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
