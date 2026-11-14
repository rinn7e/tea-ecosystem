import * as O from 'fp-ts/Option'
import { describe, expect, it } from 'vitest'

import { targetOptionsOf } from '@/common/data/catalog'
import {
  type ListingSort,
  catalogTiers,
  choiceOf,
  defaultAdjacentFilter,
  defaultCatalogFilter,
  lackables,
  statusChoiceOf,
} from '@/common/type/destination'
import { targets } from '@/common/type/framework'
import { init, update } from '@/component/listing'

describe('the toggles of each list', () => {
  const catalog = init(defaultCatalogFilter())
  const adjacent = init(defaultAdjacentFilter())

  it('ticks what an entry lacks on the adjacent list', () => {
    const [next] = update(
      { _tag: 'ToggleLacks', concept: 'cmd', options: [...lackables] },
      adjacent,
    )
    expect(next.filter.lacks).toEqual(choiceOf(lackables, ['cmd']))
  })

  it('ticks a target on either list', () => {
    const [next] = update(
      {
        _tag: 'ToggleTarget',
        target: 'web',
        options: targetOptionsOf('catalog'),
      },
      catalog,
    )
    expect(next.filter.targets).toEqual(
      choiceOf(targetOptionsOf('catalog'), ['web']),
    )
    const six = targetOptionsOf('adjacent')
    const [nextAdjacent] = update(
      { _tag: 'ToggleTarget', target: 'web', options: six },
      adjacent,
    )
    expect(nextAdjacent.filter.targets).toEqual(choiceOf(six, ['web']))
  })

  it('ignores a filter of the other list', () => {
    expect(
      update(
        { _tag: 'ToggleTier', tier: 'full', options: [...catalogTiers] },
        adjacent,
      )[0],
    ).toEqual(adjacent)
    expect(
      update({ _tag: 'ToggleShow', category: 'languages' }, adjacent)[0],
    ).toEqual(adjacent)
    expect(
      update(
        { _tag: 'ToggleLacks', concept: 'cmd', options: [...lackables] },
        catalog,
      )[0],
    ).toEqual(catalog)
  })
})

describe('Clear filters', () => {
  it('clears each list back to its default filter, keeping layout and sort', () => {
    const sort = O.some<ListingSort>({
      column: 'stars',
      direction: 'ascending',
    })
    const catalog = init({
      ...defaultCatalogFilter(),
      tiers: choiceOf(catalogTiers, ['full']),
      show: O.some('frameworks'),
      targets: choiceOf(targets, ['web']),
      query: 'rust',
      language: O.some('Rust'),
      layout: 'table',
      sort,
    })
    expect(update({ _tag: 'ClearFilter' }, catalog)[0].filter).toEqual({
      ...defaultCatalogFilter(),
      layout: 'table',
      sort,
    })
    const adjacent = init({
      ...defaultAdjacentFilter(),
      lacks: choiceOf(lackables, ['cmd']),
      statuses: statusChoiceOf(['archived']),
      layout: 'table',
      sort,
    })
    expect(update({ _tag: 'ClearFilter' }, adjacent)[0].filter).toEqual({
      ...defaultAdjacentFilter(),
      layout: 'table',
      sort,
    })
  })
})
