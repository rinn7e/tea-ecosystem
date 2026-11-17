import { describe, expect, it } from 'vitest'

import { storedAdjacentEntries, storedFrameworks } from '@/common/data/catalog'
import { pagePaths, renderPage } from '@/prerender'

const boot = { now: Date.parse('2026-11-17T00:00:00Z'), windowWidth: 390 }

describe('the pages rendered ahead of time', () => {
  it('render every list, every page that stands alone and every entry, once', () => {
    expect(new Set(pagePaths).size).toBe(pagePaths.length)
    expect(pagePaths).toEqual(
      expect.arrayContaining([
        '/',
        '/adjacent',
        '/rubric',
        '/about',
        '/build-your-own',
        ...[...storedFrameworks, ...storedAdjacentEntries].map(
          (entry) => `/framework/${entry.id}`,
        ),
      ]),
    )
  })

  it('give the page of an entry its own title and description', () => {
    const page = renderPage('/framework/elm', boot)
    expect(page.title).toBe('Elm | TEA Ecosystem')
    expect(page.description).toBe(
      'The language The Elm Architecture comes from, and the reference every other entry is graded against.',
    )
    expect(page.html).toContain('>Elm</h1>')
  })

  it('render each page as itself, never as Not Found, with a title of its own', () => {
    // A path the app does not route still renders, as Not Found
    const titles = pagePaths.map((path) => renderPage(path, boot).title)
    expect(titles.filter((title) => title.startsWith('Not found'))).toEqual([])
    expect(new Set(titles).size).toBe(titles.length)
  })
})
