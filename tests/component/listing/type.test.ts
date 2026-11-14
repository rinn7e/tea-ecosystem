import { describe, expect, it } from 'vitest'

import {
  AdjacentFilterEq,
  CatalogFilterEq,
  choiceOf,
  defaultAdjacentFilter,
  defaultCatalogFilter,
  lackables,
} from '@/common/type/destination'
import { init, mkModelEq } from '@/component/listing'

describe('mkModelEq', () => {
  it('compares a model of the catalog by its filter and its popover', () => {
    const eq = mkModelEq(CatalogFilterEq)
    const catalog = init(defaultCatalogFilter())
    expect(eq.equals(catalog, init(defaultCatalogFilter()))).toBe(true)
    expect(eq.equals(catalog, { ...catalog, panel: 'open' })).toBe(false)
    expect(
      eq.equals(catalog, init({ ...defaultCatalogFilter(), query: 'x' })),
    ).toBe(false)
  })

  it('compares a model of the adjacent list by what an entry lacks', () => {
    const eq = mkModelEq(AdjacentFilterEq)
    const adjacent = init(defaultAdjacentFilter())
    expect(eq.equals(adjacent, init(defaultAdjacentFilter()))).toBe(true)
    expect(
      eq.equals(
        adjacent,
        init({
          ...defaultAdjacentFilter(),
          lacks: choiceOf(lackables, ['cmd']),
        }),
      ),
    ).toBe(false)
  })
})
