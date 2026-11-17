import { fc, test } from '@fast-check/vitest'
import * as O from 'fp-ts/Option'
import { describe, expect, it } from 'vitest'

import { BOOT_ELEMENT_ID, bootOf, bootScriptOf } from '@/common/util/boot'

// A document that holds one element, with the text `text`
const documentWith = (id: string, text: string) => ({
  getElementById: (wanted: string) =>
    wanted === id ? { textContent: text } : null,
})

// The text of the script element `bootScriptOf` writes
const scriptTextOf = (script: string): string =>
  script.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')

describe('bootOf', () => {
  test.prop([
    fc.record({
      now: fc.integer({ min: 0, max: 4_102_444_800_000 }),
      windowWidth: fc.integer({ min: 0, max: 4000 }),
    }),
  ])('reads back the values a prerendered page was written with', (boot) => {
    expect(
      bootOf(documentWith(BOOT_ELEMENT_ID, scriptTextOf(bootScriptOf(boot)))),
    ).toEqual(O.some(boot))
  })

  it('finds none on a page that was not rendered ahead of time', () => {
    expect(bootOf(documentWith('other', '{}'))).toEqual(O.none)
  })

  it('finds none in text that is not the boot values', () => {
    expect(bootOf(documentWith(BOOT_ELEMENT_ID, 'not json'))).toEqual(O.none)
    expect(
      bootOf(documentWith(BOOT_ELEMENT_ID, '{"now":"today","windowWidth":1}')),
    ).toEqual(O.none)
  })
})
