import * as A from 'fp-ts/Array'
import { pipe } from 'fp-ts/function'
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'

import { storedAdjacentEntries, storedFrameworks } from '@/common/data/catalog'
import { type Boot } from '@/common/util/boot'
import { titleOf } from '@/handler/navigation-handler'

import { App } from './app'
import { type Model } from './type'
import { init } from './update'

export { bootScriptOf } from '@/common/util/boot'

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

const descriptionOf = (model: Model): string =>
  model.screenModel._tag === 'FrameworkScreenModel'
    ? `${model.screenModel.model.framework.name}: ${model.screenModel.model.framework.summary}`
    : SITE_DESCRIPTION

export type RenderedPage = {
  html: string
  title: string
  description: string
}

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
  }
}
