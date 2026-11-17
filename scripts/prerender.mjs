// Renders every page of the site to HTML ahead of time, after `vite build`
// (the client, in `dist/`) and `vite build --ssr src/prerender.tsx` (the
// renderer, in `dist-ssr/`). Each page gets its own file, its own title,
// description, canonical link and link preview, and the time and width it
// was rendered with (`src/common/util/boot.ts`), so the browser hydrates it.
// `dist/404.html` stays the empty page, for an address no page has.
//
// Run by `pnpm run build`.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import {
  SITE_URL,
  bootScriptOf,
  pagePaths,
  renderPage,
} from '../dist-ssr/prerender.js'

const DIST = 'dist'

// The width of a phone: most visitors come on one. The language logos fall
// into the same rows on a phone, a tablet and a desktop, so the page a
// wider screen hydrates is the same.
const boot = { now: Date.now(), windowWidth: 390 }

const escapeHtml = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

// Replaces the one match of `pattern` in `html`, and fails the build when
// the template no longer has it
const replaceOnce = (html, pattern, replacement) => {
  if (!pattern.test(html)) {
    throw new Error(`prerender: the template has no ${pattern}`)
  }
  return html.replace(pattern, replacement)
}

const fileOf = (pagePath) =>
  pagePath === '/' ? 'index.html' : `${pagePath.slice(1)}.html`

const template = readFileSync(path.join(DIST, 'index.html'), 'utf8')

const pageHtmlOf = (pagePath) => {
  const page = renderPage(pagePath, boot)
  const url = `${SITE_URL}${pagePath === '/' ? '/' : pagePath}`
  const title = escapeHtml(page.title)
  const description = escapeHtml(page.description)
  return [
    [/<title>[^<]*<\/title>/, `<title>${title}</title>`],
    [
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${description}" />`,
    ],
    [
      /<link rel="canonical" href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${url}" />`,
    ],
    [
      /<meta property="og:url" content="[^"]*"\s*\/?>/,
      `<meta property="og:url" content="${url}" />`,
    ],
    [
      /<meta property="og:title" content="[^"]*"\s*\/?>/,
      `<meta property="og:title" content="${title}" />`,
    ],
    [
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${description}" />`,
    ],
    [
      /<div id="root"><\/div>/,
      `<div id="root">${page.html}</div>${bootScriptOf(boot)}`,
    ],
  ].reduce(
    (html, [pattern, replacement]) => replaceOnce(html, pattern, replacement),
    template,
  )
}

pagePaths.forEach((pagePath) => {
  const file = path.join(DIST, fileOf(pagePath))
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, pageHtmlOf(pagePath))
})

writeFileSync(
  path.join(DIST, 'sitemap.xml'),
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pagePaths.map(
      (pagePath) => `  <url><loc>${SITE_URL}${pagePath}</loc></url>`,
    ),
    '</urlset>',
    '',
  ].join('\n'),
)

console.log(`prerender: ${pagePaths.length} pages`)
