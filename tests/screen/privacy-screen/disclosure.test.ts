import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// What the privacy page discloses, per file: a file that starts making
// requests, keeping data in the browser or loading an asset from another
// host fails this test until the page says so (see "The privacy page" in
// `doc/code-convention.md`)
const disclosed: Record<string, Use[]> = {
  // The star count, from the GitHub API, kept an hour in `localStorage`
  'src/common/util/repo-stars.ts': ['request', 'storage'],
}

const uses = ['request', 'storage', 'remote asset'] as const
type Use = (typeof uses)[number]

// The site itself (the canonical link of `index.html`) is no other host
const remote = String.raw`https?:\/\/(?!tea\.rinn7e\.com)`

const patterns: Record<Use, RegExp> = {
  request:
    /\bfetch\(|XMLHttpRequest|sendBeacon|new WebSocket|new EventSource|<iframe/,
  storage:
    /localStorage|sessionStorage|indexedDB|document\.cookie|caches\.open/,
  'remote asset': new RegExp(
    String.raw`\b(src|href)=\{?["'\`]` +
      remote +
      String.raw`|url\(\s*["']?` +
      remote +
      String.raw`|@import\s+(url\()?["']?` +
      remote,
  ),
}

const root = fileURLToPath(new URL('../../..', import.meta.url))

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory()
      ? filesUnder(path)
      : /\.(ts|tsx|css|html)$/.test(entry.name)
        ? [path]
        : []
  })

const usesOf = (text: string): Use[] =>
  uses.filter((use) => patterns[use].test(text))

// Links (`<a href>`) are not loaded, so only `index.html` reads its
// `href` as an asset (`<link>`); a view checks `src` alone
const usesOfFile = (path: string, text: string): Use[] =>
  usesOf(
    path.endsWith('.tsx') ? text.replace(/\bhref=\{?["'`]https?:/g, '') : text,
  )

describe('the privacy page', () => {
  it('discloses every file that makes requests, keeps data in the browser or loads a remote asset', () => {
    const found = Object.fromEntries(
      [...filesUnder(join(root, 'src')), join(root, 'index.html')]
        .map((path): [string, Use[]] => [
          relative(root, path),
          usesOfFile(path, readFileSync(path, 'utf8')),
        ])
        .filter(([, uses]) => uses.length > 0),
    )
    expect(found).toEqual(disclosed)
  })

  it('reads each use from the code', () => {
    expect(usesOf("fetch('https://example.com')")).toEqual(['request'])
    expect(usesOf('window.sessionStorage.setItem(k, v)')).toEqual(['storage'])
    expect(
      usesOf('<script src="https://cdn.example.com/a.js"></script>'),
    ).toEqual(['remote asset'])
    expect(usesOf("@import url('https://fonts.example.com/x.css');")).toEqual([
      'remote asset',
    ])
    expect(usesOf('<a href="https://elm-lang.org/">')).toEqual(['remote asset'])
    expect(
      usesOfFile('view.tsx', '<a href="https://elm-lang.org/">Elm</a>'),
    ).toEqual([])
    expect(
      usesOf('<link rel="canonical" href="https://tea.rinn7e.com/" />'),
    ).toEqual([])
  })
})
