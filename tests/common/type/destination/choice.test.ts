import { describe, expect, it } from 'vitest'

import {
  anyChoice,
  choiceOf,
  defaultStatusChoice,
  isAnyTicked,
  isStatusTicked,
  isTicked,
  narrowsChoice,
  passesStatus,
  statusChoiceOf,
  tickedOf,
  toggleChoice,
  toggleStatus,
} from '@/common/type/destination'

const options = ['web', 'ssr', 'tui'] as const

describe('choiceOf', () => {
  it('gives one state per meaning', () => {
    expect(choiceOf(options, [])).toEqual(anyChoice(false))
    expect(choiceOf(options, ['tui', 'ssr', 'web'])).toEqual(anyChoice(true))
    expect(choiceOf(options, ['tui', 'web'])).toEqual({
      _tag: 'Only',
      chosen: ['web', 'tui'],
    })
  })

  it('leaves out what the list does not offer', () => {
    expect(choiceOf(['web', 'ssr'], ['game'])).toEqual(anyChoice(false))
    expect(choiceOf(['web', 'ssr'], ['web', 'ssr', 'game'])).toEqual(
      anyChoice(true),
    )
  })

  it('narrows only with some options, not none or every one', () => {
    expect(narrowsChoice(choiceOf(options, []))).toBe(false)
    expect(narrowsChoice(choiceOf(options, ['web']))).toBe(true)
    expect(narrowsChoice(choiceOf(options, [...options]))).toBe(false)
  })
})

describe('toggleChoice', () => {
  it('ticks and unticks, in the order of the options', () => {
    const one = toggleChoice(options, anyChoice(false), 'tui')
    expect(one).toEqual({ _tag: 'Only', chosen: ['tui'] })
    const two = toggleChoice(options, one, 'web')
    expect(two).toEqual({ _tag: 'Only', chosen: ['web', 'tui'] })
    expect(toggleChoice(options, two, 'tui')).toEqual({
      _tag: 'Only',
      chosen: ['web'],
    })
  })

  it('keeps every box ticked on screen, and narrows nothing', () => {
    const two = choiceOf(options, ['web', 'ssr'])
    const every = toggleChoice(options, two, 'tui')
    expect(every).toEqual(anyChoice(true))
    expect(tickedOf(options, every)).toEqual([...options])
    expect(isAnyTicked(every)).toBe(true)
    // Unticking one from every box leaves the others
    expect(toggleChoice(options, every, 'ssr')).toEqual({
      _tag: 'Only',
      chosen: ['web', 'tui'],
    })
  })

  it('goes back to no box ticked when the last one is unticked', () => {
    const none = toggleChoice(options, choiceOf(options, ['ssr']), 'ssr')
    expect(none).toEqual(anyChoice(false))
    expect(isTicked(none, 'ssr')).toBe(false)
    expect(isAnyTicked(none)).toBe(false)
  })
})

describe('the statuses', () => {
  it('reads the default statuses as the default, whatever the order', () => {
    expect(statusChoiceOf(['quiet', 'active'])).toEqual(defaultStatusChoice())
    expect(statusChoiceOf(['active', 'quiet', 'archived'])).toEqual(
      anyChoice(true),
    )
    expect(statusChoiceOf([])).toEqual(anyChoice(false))
  })

  it('shows and hides the archive from the default with one press each', () => {
    const shown = toggleStatus(defaultStatusChoice(), 'archived')
    expect(shown).toEqual(anyChoice(true))
    expect(toggleStatus(shown, 'archived')).toEqual(defaultStatusChoice())
  })

  it('ticks the default statuses and hides the archive by default', () => {
    expect(isStatusTicked(defaultStatusChoice(), 'quiet')).toBe(true)
    expect(isStatusTicked(defaultStatusChoice(), 'archived')).toBe(false)
    expect(passesStatus(defaultStatusChoice(), 'archived')).toBe(false)
    // No box ticked shows every status, as every box does
    expect(passesStatus(anyChoice(false), 'archived')).toBe(true)
  })
})
