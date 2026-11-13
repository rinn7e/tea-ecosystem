import { describe, expect, it } from 'vitest'

import {
  catalogScreen,
  destinationOfScreen,
  frameworkScreen,
  rubricScreen,
} from '@/common/type/destination'
import { isScreenBelow } from '@/util'

const catalog = destinationOfScreen(catalogScreen())
const miso = destinationOfScreen(frameworkScreen('miso'))
const iced = destinationOfScreen(frameworkScreen('iced'))
const rubric = destinationOfScreen(rubricScreen())

describe('isScreenBelow', () => {
  it('holds for the catalog under a framework page', () => {
    expect(isScreenBelow(miso, catalog)).toBe(true)
  })

  it('does not hold the other way, nor between two frameworks', () => {
    expect(isScreenBelow(catalog, miso)).toBe(false)
    expect(isScreenBelow(miso, iced)).toBe(false)
  })

  it('does not hold for a screen that stands alone', () => {
    expect(isScreenBelow(miso, rubric)).toBe(false)
    expect(isScreenBelow(rubric, catalog)).toBe(false)
  })
})
