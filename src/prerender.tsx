import * as A from 'fp-ts/Array'
import { pipe } from 'fp-ts/function'
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'

import {
  entriesAt,
  storedAdjacentEntries,
  storedFrameworks,
} from '@/common/data/catalog'
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
  shareCardOf,
  shareLogoOf,
  svgOfShapes,
} from './share-card'

// The build renders every page of the site to HTML ahead of time
// (`scripts/prerender.mjs`): a visitor sees the page before the script
// has loaded, and a search engine or a link preview reads its content.
// The script then hydrates it (`src/root.tsx`).

export const SITE_URL = 'https://tea.rinn7e.com'

// Every page: the lists, the standalone pages and the page of each entry.
// A list with a filter in its query opens from the HTML of the plain list.
export const pagePaths: string[] = [
  '/',
  '/adjacent',
  '/rubric',
  '/about',
  '/build-your-own',
  ...pipe(
    [...storedFrameworks, ...storedAdjacentEntries],
    A.map((entry) => `/framework/${entry.id}`),
  ),
]

const SITE_DESCRIPTION =
  'Every framework that implements The Elm Architecture (TEA, Model View Update), in every language, graded part by part against Elm.'

// The summary of an entry alone: its title already names it, and a link
// preview cuts the description short
const descriptionOf = (model: Model): string =>
  model.screenModel._tag === 'FrameworkScreenModel'
    ? model.screenModel.model.framework.summary
    : SITE_DESCRIPTION

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
    : 'The catalog of TEA Ecosystem: its language logos and the first framework cards'

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

// The share card of the page at `path`, where it has one: an entry page
// shows its entry, every other page the screenshot of the catalog
export const shareImageOf = (path: string): string =>
  path.startsWith('/framework/')
    ? `/og/${path.slice('/framework/'.length)}.png`
    : '/og-image.png'
