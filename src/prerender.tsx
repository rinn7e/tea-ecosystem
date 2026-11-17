import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import { pipe } from 'fp-ts/function'
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'

import {
  entriesAt,
  storedAdjacentEntries,
  storedFrameworks,
} from '@/common/data/catalog'
import {
  type SitePage,
  pageHeadingOf,
  sitePagePathOf,
  sitePages,
} from '@/common/data/page-heading'
import { type Framework } from '@/common/type/framework'
import { type Boot } from '@/common/util/boot'
import { titleOf } from '@/handler/navigation-handler'

import { App } from './app'
import { type Model } from './type'
import { init } from './update'

export { bootScriptOf } from '@/common/util/boot'
export {
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  STAR_SVG,
  pageCardOf,
  pageCardViewOf,
  shareCardOf,
  shareLogoOf,
  svgOfShapes,
} from './share-card'
export { entriesAt, sitePages }

// The build renders every page of the site to HTML ahead of time
// (`scripts/prerender.mjs`): a visitor sees the page before the script
// has loaded, and a search engine or a link preview reads its content.
// The script then hydrates it (`src/root.tsx`).

export const SITE_URL = 'https://tea.rinn7e.com'

// Every page: the lists, the standalone pages and the page of each entry.
// A list with a filter in its query opens from the HTML of the plain list.
export const pagePaths: string[] = [
  ...sitePages.map(sitePagePathOf),
  ...pipe(
    [...storedFrameworks, ...storedAdjacentEntries],
    A.map((entry) => `/framework/${entry.id}`),
  ),
]

// The page of each screen that is not an entry (Not Found takes the
// catalog, as no page renders it)
const sitePageOf = (model: Model): SitePage => {
  switch (model.screenModel._tag) {
    case 'AdjacentScreenModel':
      return 'adjacent'
    case 'RubricScreenModel':
      return 'rubric'
    case 'AboutScreenModel':
      return 'about'
    case 'BuildScreenModel':
      return 'build'
    case 'CatalogScreenModel':
    case 'FrameworkScreenModel':
    case 'NotFoundScreenModel':
      return 'catalog'
  }
}

// The summary of an entry alone: its title already names it, and a link
// preview cuts the description short. Any other page: its lead.
const descriptionOf = (model: Model): string =>
  model.screenModel._tag === 'FrameworkScreenModel'
    ? model.screenModel.model.framework.summary
    : pageHeadingOf(sitePageOf(model)).lead

export type RenderedPage = {
  html: string
  title: string
  description: string
  // The `og:image:alt` of the share card of an entry page
  shareImageAlt: string
}

const shareImageAltOf = (model: Model): string =>
  model.screenModel._tag === 'FrameworkScreenModel'
    ? `The card of ${model.screenModel.model.framework.name}: its logo, its grades and its summary`
    : `TEA Ecosystem: ${pageHeadingOf(sitePageOf(model)).title}`

// The page at `path`, as the browser draws it first at the same `boot`
export const renderPage = (path: string, boot: Boot): RenderedPage => {
  const [model] = init(
    { href: `${SITE_URL}${path}` },
    boot.windowWidth,
    boot.now,
  )
  return {
    html: renderToString(
      <StrictMode>
        <App model={model} dispatch={() => undefined} />
      </StrictMode>,
    ),
    title: titleOf(model),
    description: descriptionOf(model),
    shareImageAlt: shareImageAltOf(model),
  }
}

// The entries that get a share card (`src/share-card.tsx`), with their
// status at the time the pages are rendered
export const sharedEntriesAt = (now: number): Framework[] => {
  const entries = entriesAt(now)
  return [...entries.catalog, ...entries.adjacent]
}

// The share card of the page at `path`: an entry page shows its entry,
// every other page its heading (`og/page/<page>.png`)
export const shareImageOf = (path: string): string =>
  path.startsWith('/framework/')
    ? `/og/${path.slice('/framework/'.length)}.png`
    : pipe(
        sitePages,
        RA.findFirst((page) => sitePagePathOf(page) === path),
        O.fold(
          () => '/og/page/catalog.png',
          (page) => `/og/page/${page}.png`,
        ),
      )
