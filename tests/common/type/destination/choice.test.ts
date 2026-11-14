import { fc, test } from '@fast-check/vitest'
import * as S from 'fp-ts/string'
import { isDeepStrictEqual } from 'node:util'
import { describe, expect } from 'vitest'

import {
  StatusChoiceEq,
  choiceOf,
  defaultStatusChoice,
  getChoiceEq,
  isTicked,
  narrowsChoice,
  passesStatus,
  statusChoiceOf,
  tickedOf,
  toggleChoice,
  toggleStatus,
} from '@/common/type/destination'
import { statuses } from '@/common/type/framework'

import { choiceArb, statusChoiceArb } from '../../../helper/arbitrary'

const options = ['web', 'ssr', 'server', 'tui'] as const

describe('choiceOf', () => {
  test.prop([fc.subarray([...options]), fc.subarray(['game', 'mobile'])])(
    'keeps what it is given among the options, in their order, and narrows only with some of them',
    (chosen, outside) => {
      const choice = choiceOf(options, [...outside, ...chosen].reverse())
      expect(tickedOf(options, choice)).toEqual(chosen)
      expect(narrowsChoice(choice)).toBe(
        chosen.length > 0 && chosen.length < options.length,
      )
    },
  )
})

describe('toggleChoice', () => {
  test.prop([choiceArb(options), fc.constantFrom(...options)])(
    'flips one box and leaves the others, and twice gives the choice back',
    (choice, value) => {
      const once = toggleChoice(options, choice, value)
      expect(isTicked(once, value)).toBe(!isTicked(choice, value))
      options
        .filter((option) => option !== value)
        .forEach((option) =>
          expect(isTicked(once, option)).toBe(isTicked(choice, option)),
        )
      expect(toggleChoice(options, once, value)).toEqual(choice)
    },
  )
})

describe('the statuses', () => {
  test.prop([fc.subarray([...statuses]), fc.constantFrom(...statuses)])(
    'read the default statuses as the default, in any order, and flip one box at a time',
    (chosen, status) => {
      const choice = statusChoiceOf([...chosen].reverse())
      expect(choice._tag === 'Default').toBe(
        isDeepStrictEqual(chosen, ['active', 'quiet']),
      )
      const once = toggleStatus(choice, status)
      expect(toggleStatus(once, status)).toEqual(choice)
    },
  )

  test.prop([statusChoiceArb])(
    'hide the archive only under the default or a choice without it',
    (choice) => {
      expect(passesStatus(choice, 'archived')).toBe(
        choice._tag === 'Any' ||
          (choice._tag === 'Only' && choice.chosen.includes('archived')),
      )
      expect(passesStatus(defaultStatusChoice(), 'archived')).toBe(false)
    },
  )
})

describe('the equality of choices', () => {
  test.prop([choiceArb(options), choiceArb(options)])(
    'agrees with deep equality',
    (x, y) => {
      expect(getChoiceEq(S.Eq).equals(x, y)).toBe(isDeepStrictEqual(x, y))
    },
  )

  test.prop([statusChoiceArb, statusChoiceArb])(
    'of statuses agrees with deep equality',
    (x, y) => {
      expect(StatusChoiceEq.equals(x, y)).toBe(isDeepStrictEqual(x, y))
    },
  )
})
