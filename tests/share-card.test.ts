import * as O from 'fp-ts/Option'
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  pagePaths,
  shareImageOf,
  shareLogoOf,
  sharedEntriesAt,
} from '@/prerender'
import { type ShareLogo } from '@/share-card'

// The build draws each card with satori and fails on one it cannot draw
// (`scripts/prerender.mjs`): satori does not load under Vitest
const entries = sharedEntriesAt(Date.parse('2026-11-17T00:00:00Z'))

const isDrawable = (logo: ShareLogo): boolean =>
  logo._tag === 'Shapes' ||
  existsSync(new URL(`../public/logo/${logo.file}`, import.meta.url))

describe('the share cards', () => {
  it('give the page of every entry its own card, and every other page the catalog', () => {
    expect(
      entries.map((entry) => shareImageOf(`/framework/${entry.id}`)),
    ).toEqual(entries.map((entry) => `/og/${entry.id}.png`))
    const others = pagePaths.filter((path) => !path.startsWith('/framework/'))
    expect(others.map(shareImageOf)).toEqual(others.map(() => '/og-image.png'))
  })

  it('draw a logo on every card, from a file that exists', () => {
    const wrong = entries.filter(
      (entry) => !O.exists(isDrawable)(shareLogoOf(entry)),
    )
    expect(wrong.map((entry) => entry.id)).toEqual([])
  })
})
