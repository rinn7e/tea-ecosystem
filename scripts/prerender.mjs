// Renders every page of the site to HTML ahead of time, after `vite build`
// (the client, in `dist/`) and `vite build --ssr src/prerender.tsx` (the
// renderer, in `dist-ssr/`). Each page gets its own file, its own title,
// description, canonical link and link preview, and the time and width it
// was rendered with (`src/common/util/boot.ts`), so the browser hydrates it.
// Each entry also gets a share card, `dist/og/<id>.png` (`src/share-card.tsx`,
// drawn with satori and resvg), the `og:image` of its page.
// `dist/404.html` stays the empty page, for an address no page has.
//
// Run by `pnpm run build`.
import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import satori from 'satori'
import sharp from 'sharp'

import {
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  SITE_URL,
  STAR_SVG,
  bootScriptOf,
  entriesAt,
  pageCardOf,
  pageCardViewOf,
  pagePaths,
  renderPage,
  shareCardOf,
  shareImageOf,
  shareLogoOf,
  sharedEntriesAt,
  sitePages,
  starsOfJson,
  svgOfShapes,
} from '../dist-ssr/prerender.js'

const DIST = 'dist'

// The star count of the repository, read once for every page, so the bar
// shows it from the first paint and a visit asks GitHub for it at most once
// an hour (`repoStarsCmd`). With the token of the workflow when there is
// one, past the limit of 60 requests an hour per address; none when GitHub
// does not answer, and the bar then waits for the live count.
const REPO_API = 'https://api.github.com/repos/rinn7e/tea-ecosystem'
const USER_AGENT =
  'tea-ecosystem-prerender (+https://github.com/rinn7e/tea-ecosystem)'

const repoStars = await fetch(REPO_API, {
  headers: {
    Accept: 'application/vnd.github+json',
    'User-Agent': USER_AGENT,
    ...(process.env.GITHUB_TOKEN === undefined
      ? {}
      : { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
  },
})
  .then((response) => (response.ok ? response.json() : null))
  .then((json) => {
    const stars = starsOfJson(json)
    return stars._tag === 'Right' ? stars.right : undefined
  })
  .catch(() => undefined)

// The width of a phone: most visitors come on one. The language logos fall
// into the same rows on a phone, a tablet and a desktop, so the page a
// wider screen hydrates is the same.
const boot = {
  now: Date.now(),
  windowWidth: 390,
  ...(repoStars === undefined ? {} : { repoStars }),
}

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

// The `og:image` tags of a page: its share card (`index.html` names the
// card of the catalog)
const shareImageTagsOf = (pagePath, page) => [
  [
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:image" content="${SITE_URL}${shareImageOf(pagePath)}" />`,
  ],
  [
    /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:image:alt" content="${escapeHtml(page.shareImageAlt)}" />`,
  ],
]

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
    ...shareImageTagsOf(pagePath, page),
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

// The share cards
const fonts = [400, 500, 600].map((weight) => ({
  name: 'IBM Plex Sans',
  weight,
  style: 'normal',
  data: readFileSync(
    `node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-${weight}-normal.woff`,
  ),
}))

const svgDataUrlOf = (svg) =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

// Resvg draws no WebP, so a WebP logo goes in as a PNG
const fileDataUrlOf = async (file) => {
  const data = readFileSync(path.join('public', 'logo', file))
  return file.endsWith('.svg')
    ? svgDataUrlOf(data)
    : `data:image/png;base64,${(await sharp(data).png().toBuffer()).toString('base64')}`
}

const shareLogoSrcOf = (logo) =>
  logo._tag === 'File'
    ? fileDataUrlOf(logo.file)
    : Promise.resolve(svgDataUrlOf(svgOfShapes(logo.viewBox, logo.paths)))

// An `Option` of fp-ts, as `shareCardOf` takes it
const logoSrcOf = async (framework) => {
  const logo = shareLogoOf(framework)
  return logo._tag === 'None'
    ? logo
    : { _tag: 'Some', value: await shareLogoSrcOf(logo.value) }
}

const emblemSrc = svgDataUrlOf(readFileSync('public/favicon.svg'))
const starSrc = svgDataUrlOf(STAR_SVG)

const pngOf = async (card) =>
  new Resvg(
    await satori(card, {
      width: SHARE_CARD_WIDTH,
      height: SHARE_CARD_HEIGHT,
      fonts,
    }),
    { fitTo: { mode: 'width', value: SHARE_CARD_WIDTH } },
  )
    .render()
    .asPng()

mkdirSync(path.join(DIST, 'og', 'page'), { recursive: true })

const entries = sharedEntriesAt(boot.now)
await Promise.all(
  entries.map(async (framework) =>
    writeFileSync(
      path.join(DIST, 'og', `${framework.id}.png`),
      await pngOf(
        shareCardOf({
          framework,
          logoSrc: await logoSrcOf(framework),
          emblemSrc,
          starSrc,
        }),
      ),
    ),
  ),
)

await Promise.all(
  sitePages.map(async (sitePage) => {
    const card = pageCardOf(entriesAt(boot.now))(sitePage)
    const logoSrcs = await Promise.all(
      card.strip._tag === 'Logos' ? card.strip.logos.map(shareLogoSrcOf) : [],
    )
    writeFileSync(
      path.join(DIST, 'og', 'page', `${sitePage}.png`),
      await pngOf(pageCardViewOf({ card, logoSrcs, emblemSrc })),
    )
  }),
)

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

console.log(
  `prerender: ${pagePaths.length} pages, ${entries.length + sitePages.length} share cards, ${repoStars ?? 'no'} stars`,
)
