import * as O from 'fp-ts/Option'
import { describe, expect, it } from 'vitest'

import { adjacentEntries, frameworks } from '@/common/data/catalog'
import {
  languageLogoOf,
  monogramOf,
  readableColorOf,
} from '@/common/data/language-logo'

// Languages Simple Icons has no logo for: drawn as a monogram
const withoutLogo = ['Gren']

describe('languageLogoOf', () => {
  it('has a logo for every language of the data but the known ones', () => {
    const languages = new Set([
      ...frameworks.map((f) => f.language),
      ...adjacentEntries.map((e) => e.language),
    ])
    const missing = [...languages].filter(
      (language) =>
        O.isNone(languageLogoOf(language)) && !withoutLogo.includes(language),
    )
    expect(missing).toEqual([])
  })
})

describe('monogramOf', () => {
  it('takes the first letters of two words, else two letters of one', () => {
    expect(monogramOf('Bubble Tea')).toBe('BT')
    expect(monogramOf('Elmish (Fable)')).toBe('EF')
    expect(monogramOf('Lustre')).toBe('Lu')
    expect(monogramOf('@typescript-tea/core')).toBe('TT')
    expect(monogramOf('Gren')).toBe('Gr')
  })
})

describe('readableColorOf', () => {
  it('keeps a brand color that reads on both panels', () => {
    expect(readableColorOf('1293D8')).toBe('#1293d8')
    expect(readableColorOf('F05138')).toBe('#f05138')
  })

  it('moves a black or a pale logo to a shade that reads on both', () => {
    const contrast = (a: string, b: string) => {
      const lum = (hex: string) =>
        [1, 3, 5]
          .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
          .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
          .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0)
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
      return (hi! + 0.05) / (lo! + 0.05)
    }
    ;['000000', 'FFAFF3', 'F7DF1E', '5D4F85'].forEach((hex) => {
      const color = readableColorOf(hex)
      expect(contrast(color, '#ffffff')).toBeGreaterThanOrEqual(3)
      expect(contrast(color, '#0c1c27')).toBeGreaterThanOrEqual(3)
    })
  })
})
