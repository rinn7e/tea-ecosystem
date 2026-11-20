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
        '/privacy',
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

  it('link each language of an entry to its list, filtered by it', () => {
    // A catalog entry, a TEA-adjacent one, one in two languages, a language
    expect(renderPage('/framework/bubbletea', boot).html).toContain(
      'href="/?language=Go"',
    )
    expect(renderPage('/framework/xstate', boot).html).toContain(
      'href="/adjacent?language=TypeScript"',
    )
    const keemun = renderPage('/framework/keemun', boot).html
    expect(keemun).toContain('href="/?language=Kotlin"')
    expect(keemun).toContain('href="/?language=Swift"')
    expect(renderPage('/framework/elm', boot).html).toContain(
      'href="/?show=languages"',
    )
  })

  it('draw the star count the build read in the bar', () => {
    expect(renderPage('/', { ...boot, repoStars: 1234 }).html).toContain(
      '1.2k stars',
    )
  })

  it('draw the year of the copyright line from the time of the root', () => {
    // The text of the page, without the markers React puts between a text
    // and a value
    const at = (iso: string) =>
      renderPage('/rubric', { ...boot, now: Date.parse(iso) }).html.replaceAll(
        '<!-- -->',
        '',
      )
    expect(at('2026-11-17T00:00:00Z')).toContain('© 2026 TEA Ecosystem')
    expect(at('2030-01-02T00:00:00Z')).toContain('© 2030 TEA Ecosystem')
  })

  it('render each page as itself, never as Not Found, with a title of its own', () => {
    // A path the app does not route still renders, as Not Found
    const titles = pagePaths.map((path) => renderPage(path, boot).title)
    expect(titles.filter((title) => title.startsWith('Not found'))).toEqual([])
    expect(new Set(titles).size).toBe(titles.length)
  })
})
