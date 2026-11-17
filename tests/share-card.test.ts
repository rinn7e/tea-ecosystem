import * as O from 'fp-ts/Option'
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { sitePagePathOf, sitePages } from '@/common/data/page-heading'
import {
  entriesAt,
  pageCardOf,
  shareImageOf,
  shareLogoOf,
  sharedEntriesAt,
} from '@/prerender'
import { type ShareLogo } from '@/share-card'

// The build draws each card with satori and fails on one it cannot draw
// (`scripts/prerender.mjs`): satori does not load under Vitest
const now = Date.parse('2026-11-17T00:00:00Z')
const entries = sharedEntriesAt(now)

const isDrawable = (logo: ShareLogo): boolean =>
  logo._tag === 'Shapes' ||
  existsSync(new URL(`../public/logo/${logo.file}`, import.meta.url))

describe('the share cards', () => {
  it('give every page its own card', () => {
    expect(
      entries.map((entry) => shareImageOf(`/framework/${entry.id}`)),
    ).toEqual(entries.map((entry) => `/og/${entry.id}.png`))
    expect(sitePages.map((page) => shareImageOf(sitePagePathOf(page)))).toEqual(
      sitePages.map((page) => `/og/page/${page}.png`),
    )
  })

  it('draw a logo on every card, from a file that exists', () => {
    const wrong = entries.filter(
      (entry) => !O.exists(isDrawable)(shareLogoOf(entry)),
    )
    expect(wrong.map((entry) => entry.id)).toEqual([])
  })

  it('draw the logos of the strip of a page from files that exist', () => {
    const cards = sitePages.map(pageCardOf(entriesAt(now)))
    const wrong = cards.filter(
      (card) =>
        card.strip._tag === 'Logos' && !card.strip.logos.every(isDrawable),
    )
    expect(wrong.map((card) => card.page)).toEqual([])
    // The catalog shows a full row of logos
    expect(cards.find((card) => card.page === 'catalog')?.strip).toMatchObject({
      _tag: 'Logos',
      logos: { length: 12 },
    })
  })
})
