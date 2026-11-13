import * as O from 'fp-ts/Option'
import { describe, expect, it } from 'vitest'

import { buildLanguages } from '@/common/type/destination'
import {
  highlightedSnippetOf,
  snippetOf,
  steps,
} from '@/screen/build-screen/step'

describe('the guide', () => {
  it('has a sample for every step in every language', () => {
    const missing = steps.flatMap((step) =>
      buildLanguages
        .filter((language) => O.isNone(snippetOf(step, language)))
        .map((language) => `${step.number}-${step.id}.${language}`),
    )
    expect(missing).toEqual([])
  })

  it('highlights every sample', () => {
    steps.forEach((step) =>
      buildLanguages.forEach((language) =>
        expect(O.isSome(highlightedSnippetOf(step, language))).toBe(true),
      ),
    )
  })
})
