import * as A from 'fp-ts/Array'
import type * as EqClass from 'fp-ts/Eq'
import * as NEA from 'fp-ts/NonEmptyArray'
import * as O from 'fp-ts/Option'
import * as B from 'fp-ts/boolean'
import { pipe } from 'fp-ts/function'
import * as S from 'fp-ts/string'

import { type Brand } from '@/common/type/brand-wrapper'
import { type Status, statuses } from '@/common/type/framework'

// A filter of the popover: the options a list offers (its tiers, targets,
// statuses or what its entries lack), an entry passes when it matches any
// option chosen. One state per meaning, so no view has to work out again
// whether a choice narrows the list:
// - `Any` narrows nothing: no box ticked, or every one (`allSelected`,
//   which only tells the popover to draw every box ticked)
// - `Only` narrows: a non-empty part of the options, never every one, and
//   never one the list does not offer
// Owned: read it anywhere as a `ChoiceShape`, but only `choiceOf` and
// `anyChoice` make one (the brand has no value), and they hold that.
// Review: a cast to it outside this file makes a state that cannot happen.
export type ChoiceShape<A> =
  | { readonly _tag: 'Any'; readonly allSelected: boolean }
  | { readonly _tag: 'Only'; readonly chosen: NEA.NonEmptyArray<A> }

declare class _ChoiceBrand {
  private _choiceBrand(): void
}

export type Choice<A> = Brand<ChoiceShape<A>, _ChoiceBrand>

const ownChoice = <A>(shape: ChoiceShape<A>): Choice<A> =>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  shape as Choice<A>

export const anyChoice = <A>(allSelected: boolean): Choice<A> =>
  ownChoice({ _tag: 'Any', allSelected })

// The choice of `chosen` among `options`, in the order of `options`: what
// is not an option left out, none `Any`, every one `Any` with every box
// ticked
export const choiceOf = <A extends string>(
  options: readonly A[],
  chosen: readonly A[],
): Choice<A> =>
  pipe(
    NEA.fromArray(options.filter((option) => chosen.includes(option))),
    O.fold(
      () => anyChoice<A>(false),
      (kept): Choice<A> =>
        kept.length === options.length
          ? anyChoice(true)
          : ownChoice({ _tag: 'Only', chosen: kept }),
    ),
  )

// Whether a choice narrows the list
export const narrowsChoice = <A>(choice: ChoiceShape<A>): boolean =>
  choice._tag === 'Only'

// Whether the box of `option` is ticked
export const isTicked = <A>(choice: ChoiceShape<A>, option: A): boolean =>
  choice._tag === 'Any' ? choice.allSelected : choice.chosen.includes(option)

// Whether any box is ticked: the choice counts on the Filters button, and
// Clear filters shows, also when every box is
export const isAnyTicked = <A>(choice: ChoiceShape<A>): boolean =>
  choice._tag === 'Only' || choice.allSelected

// The options ticked, in their order
export const tickedOf = <A>(
  options: readonly A[],
  choice: ChoiceShape<A>,
): A[] => options.filter((option) => isTicked(choice, option))

// Ticks `value`, or unticks it when ticked: ticking the last box left
// gives `Any` with every box ticked, unticking the last one `Any` with none
export const toggleChoice = <A extends string>(
  options: readonly A[],
  choice: Choice<A>,
  value: A,
): Choice<A> =>
  choiceOf(
    options,
    options.filter((option) => (option === value) !== isTicked(choice, option)),
  )

// Whether an entry passes: `has` tells whether it matches an option
export const passesChoice = <A>(
  choice: ChoiceShape<A>,
  has: (option: A) => boolean,
): boolean => choice._tag === 'Any' || choice.chosen.some(has)

export const getChoiceEq = <A>(
  eq: EqClass.Eq<A>,
): EqClass.Eq<ChoiceShape<A>> => ({
  equals: (x, y) =>
    x._tag === 'Any' && y._tag === 'Any'
      ? B.Eq.equals(x.allSelected, y.allSelected)
      : x._tag === 'Only' && y._tag === 'Only'
        ? A.getEq(eq).equals(x.chosen, y.chosen)
        : false,
})

// The statuses a list shows until others are chosen
export const defaultStatuses: readonly Status[] = ['active', 'quiet']

// The statuses of a list: a choice among the three, with its own state for
// the default (active and quiet), which hides the archive. `Only` never
// holds the default statuses: `statusChoiceOf` gives `Default` for them.
// Every box ticked (`Any`, `allSelected`) is where "Show the archived"
// leads from the default. Owned like `Choice`: only `statusChoiceOf`,
// `defaultStatusChoice` and `anyStatusChoice` make one.
export type StatusChoiceShape =
  { readonly _tag: 'Default' } | ChoiceShape<Status>

declare class _StatusChoiceBrand {
  private _statusChoiceBrand(): void
}

export type StatusChoice = Brand<StatusChoiceShape, _StatusChoiceBrand>

const ownStatusChoice = (shape: StatusChoiceShape): StatusChoice =>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  shape as StatusChoice

export const defaultStatusChoice = (): StatusChoice =>
  ownStatusChoice({ _tag: 'Default' })

// No box ticked, or every one: every status shown
export const anyStatusChoice = (allSelected: boolean): StatusChoice =>
  ownStatusChoice({ _tag: 'Any', allSelected })

export const statusChoiceOf = (chosen: readonly Status[]): StatusChoice =>
  pipe(choiceOf(statuses, chosen), (choice): StatusChoice =>
    choice._tag === 'Only' &&
    A.getEq(S.Eq).equals(choice.chosen, [...defaultStatuses])
      ? defaultStatusChoice()
      : ownStatusChoice(choice),
  )

// Whether the box of `status` is ticked: the default statuses until others
// are chosen
export const isStatusTicked = (
  choice: StatusChoiceShape,
  status: Status,
): boolean =>
  choice._tag === 'Default'
    ? defaultStatuses.includes(status)
    : isTicked(choice, status)

export const toggleStatus = (
  choice: StatusChoiceShape,
  status: Status,
): StatusChoice =>
  statusChoiceOf(
    statuses.filter(
      (option) => (option === status) !== isStatusTicked(choice, option),
    ),
  )

// Whether an entry of `status` passes: every status under `Any`
export const passesStatus = (
  choice: StatusChoiceShape,
  status: Status,
): boolean => choice._tag === 'Any' || isStatusTicked(choice, status)

export const StatusChoiceEq: EqClass.Eq<StatusChoiceShape> = {
  equals: (x, y) =>
    x._tag === 'Default' || y._tag === 'Default'
      ? x._tag === y._tag
      : getChoiceEq(S.Eq).equals(x, y),
}
