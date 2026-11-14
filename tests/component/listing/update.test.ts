import { fc, test } from '@fast-check/vitest'
import * as O from 'fp-ts/Option'
import { describe, expect, it } from 'vitest'

import { targetOptionsOf } from '@/common/data/catalog'
import {
  type EntryCategory,
  type ListingFilter,
  catalogTiers,
  defaultAdjacentFilter,
  defaultCatalogFilter,
  isStatusTicked,
  isTicked,
  lackables,
} from '@/common/type/destination'
import { statuses } from '@/common/type/framework'
import { type Msg, init, update } from '@/component/listing'

import { listingFilterArb } from '../../helper/arbitrary'

const defaultOf = (filter: ListingFilter): ListingFilter =>
  filter.list === 'catalog' ? defaultCatalogFilter() : defaultAdjacentFilter()

// A toggle of a filter of the popover that the list of `filter` has, with
// the field it changes and whether its box is ticked
const ownToggleArb = (filter: ListingFilter) => {
  const options = targetOptionsOf(filter.list)
  const target = fc.constantFrom(...options).map((target) => ({
    msg: { _tag: 'ToggleTarget', target, options } satisfies Msg,
    field: 'targets',
    isTicked: (f: ListingFilter) => isTicked(f.targets, target),
  }))
  const status = fc.constantFrom(...statuses).map((status) => ({
    msg: { _tag: 'ToggleStatus', status } satisfies Msg,
    field: 'statuses',
    isTicked: (f: ListingFilter) => isStatusTicked(f.statuses, status),
  }))
  const own =
    filter.list === 'catalog'
      ? fc.constantFrom(...catalogTiers).map((tier) => ({
          msg: {
            _tag: 'ToggleTier',
            tier,
            options: [...catalogTiers],
          } satisfies Msg,
          field: 'tiers',
          isTicked: (f: ListingFilter) =>
            f.list === 'catalog' && isTicked(f.tiers, tier),
        }))
      : fc.constantFrom(...lackables).map((concept) => ({
          msg: {
            _tag: 'ToggleLacks',
            concept,
            options: [...lackables],
          } satisfies Msg,
          field: 'lacks',
          isTicked: (f: ListingFilter) =>
            f.list === 'adjacent' && isTicked(f.lacks, concept),
        }))
  return fc.oneof(target, status, own)
}

// The toggles of the filters the list of `filter` does not have
const otherListToggles = (filter: ListingFilter): Msg[] =>
  filter.list === 'catalog'
    ? [{ _tag: 'ToggleLacks', concept: 'cmd', options: [...lackables] }]
    : [
        { _tag: 'ToggleTier', tier: 'full', options: [...catalogTiers] },
        { _tag: 'ToggleShow', category: 'languages' },
      ]

describe('the filters of a list', () => {
  test.prop([
    listingFilterArb.chain((filter) =>
      fc.tuple(fc.constant(filter), ownToggleArb(filter)),
    ),
  ])(
    'flip one box of one filter, leave the rest, and twice give the model back',
    ([filter, { msg, field, isTicked: ticked }]) => {
      const model = init(filter)
      const [once] = update(msg, model)
      expect(ticked(once.filter)).toBe(!ticked(filter))
      expect({ ...once.filter, [field]: null }).toEqual({
        ...filter,
        [field]: null,
      })
      expect(update(msg, once)[0]).toEqual(model)
    },
  )

  test.prop([listingFilterArb])(
    'ignore a filter of the other list',
    (filter) => {
      const model = init(filter)
      otherListToggles(filter).forEach((msg) =>
        expect(update(msg, model)[0]).toEqual(model),
      )
    },
  )

  test.prop([listingFilterArb])(
    'clear to the default filter of their list, keeping the layout and the sort',
    (filter) => {
      expect(update({ _tag: 'ClearFilter' }, init(filter))[0].filter).toEqual({
        ...defaultOf(filter),
        layout: filter.layout,
        sort: filter.sort,
      })
    },
  )
})

describe('the category and the language', () => {
  it('chooses a category, and clears it when chosen again', () => {
    const toggle = (show: O.Option<EntryCategory>, category: EntryCategory) =>
      update(
        { _tag: 'ToggleShow', category },
        init({ ...defaultCatalogFilter(), show }),
      )[0].filter.show
    expect(toggle(O.none, 'languages')).toEqual(O.some('languages'))
    expect(toggle(O.some('languages'), 'frameworks')).toEqual(
      O.some('frameworks'),
    )
    expect(toggle(O.some('frameworks'), 'frameworks')).toEqual(O.none)
  })

  it('chooses a language, and clears it when chosen again', () => {
    const chosen = update(
      { _tag: 'ToggleLanguage', language: 'Rust' },
      init(defaultCatalogFilter()),
    )[0]
    expect(chosen.filter.language).toEqual(O.some('Rust'))
    expect(
      update({ _tag: 'ToggleLanguage', language: 'Rust' }, chosen)[0].filter
        .language,
    ).toEqual(O.none)
  })
})

describe('sort', () => {
  it('sorts names from A, and turns around on the same column', () => {
    const byName = update(
      { _tag: 'SortBy', column: 'name' },
      init(defaultCatalogFilter()),
    )[0]
    expect(byName.filter.sort).toEqual(
      O.some({ column: 'name', direction: 'ascending' }),
    )
    expect(
      update({ _tag: 'SortBy', column: 'name' }, byName)[0].filter.sort,
    ).toEqual(O.some({ column: 'name', direction: 'descending' }))
    expect(
      update({ _tag: 'SortBy', column: 'stars' }, byName)[0].filter.sort,
    ).toEqual(O.some({ column: 'stars', direction: 'descending' }))
  })
})

describe('filter popover', () => {
  const open = update({ _tag: 'TogglePanel' }, init(defaultCatalogFilter()))[0]

  it('opens on the button, and fades out before it closes', () => {
    expect(open.panel).toBe('open')
    const closing = update({ _tag: 'TogglePanel' }, open)[0]
    expect(closing.panel).toBe('closing')
    expect(
      update({ _tag: 'PanelClosed', seq: closing.panelSeq }, closing)[0].panel,
    ).toBe('closed')
  })

  it('closes on Escape and a press outside, not inside or another key', () => {
    expect(update({ _tag: 'PanelKeyDown', key: 'Escape' }, open)[0].panel).toBe(
      'closing',
    )
    expect(update({ _tag: 'PanelKeyDown', key: 'a' }, open)[0].panel).toBe(
      'open',
    )
    expect(
      update({ _tag: 'PanelPointerDown', isInside: false }, open)[0].panel,
    ).toBe('closing')
    expect(
      update({ _tag: 'PanelPointerDown', isInside: true }, open)[0].panel,
    ).toBe('open')
  })

  it('stays open while choosing, and a stale fade does not close it', () => {
    const chosen = update(
      {
        _tag: 'ToggleTier',
        tier: 'full',
        options: ['reference', 'full', 'superset'],
      },
      open,
    )[0]
    expect(chosen.panel).toBe('open')
    const closing = update({ _tag: 'TogglePanel' }, chosen)[0]
    const reopened = update({ _tag: 'TogglePanel' }, closing)[0]
    expect(
      update({ _tag: 'PanelClosed', seq: closing.panelSeq }, reopened)[0].panel,
    ).toBe('open')
  })
})
