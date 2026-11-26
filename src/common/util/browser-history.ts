import { cmdSucceed } from '@rinn7e/tea-cup-prelude'
import { type Cmd } from 'tea-cup-fp'

import { pageScrollTop } from './page-scroll'

// The part of the Navigation API this file reads. Not every browser has
// it, and the DOM types of TypeScript do not declare `window.navigation`.
type HistoryEntry = { readonly url: string | null }

type NavigationLike = {
  readonly currentEntry: { readonly index: number } | null
  entries: () => HistoryEntry[]
}

const hasNavigation = (
  scope: object,
): scope is { navigation: NavigationLike } => 'navigation' in scope

const navigationOf = (): NavigationLike | undefined =>
  hasNavigation(window) ? window.navigation : undefined

const entryBelowUrl = (): string | undefined => {
  const navigation = navigationOf()
  const index = navigation?.currentEntry?.index
  if (navigation === undefined || index === undefined || index < 1) {
    return undefined
  } else {
    return navigation.entries()[index - 1]?.url ?? undefined
  }
}

const sameUrl = (path: string, href: string): boolean =>
  new URL(path, window.location.origin).href === new URL(href).href

// Scroll
// ---------------------------------------------
//
// The app restores the scroll of a history entry itself: the browser does it
// when the traversal lands, before the screen of that entry is drawn, so a
// long catalog came back clamped to the height of the short page it replaced.
// Each entry keeps its own `scrollY` in its state, saved by every write that
// leaves it (`pushUrl`, `backOrPushUrl`) and read when the browser lands on
// it (`savedScrollOfEntry`, in `UrlChanged`). Those writes run in the URL
// writer of the program (`urlWriterOf` in `src/util/url.ts`), after `update`
// and before React draws the step, so the page is still the one the entry
// leaves, at its scroll. The view never writes the history: a link only
// dispatches its move. The step decides where the screen it shows is drawn
// (`Model.scroll`), and the app scrolls there after React has drawn that
// screen and before the browser paints it (`useScrollOf`), so the first
// frame of a list is already at its place.

type ScrollState = { readonly scrollY: number }

const isScrollState = (state: unknown): state is ScrollState =>
  typeof state === 'object' &&
  state !== null &&
  'scrollY' in state &&
  typeof state.scrollY === 'number'

// The scroll of the page, kept in the history entry shown
const saveScrollOfEntry = (): void => {
  const state: ScrollState = { scrollY: pageScrollTop() }
  window.history.replaceState(state, '')
}

// 0 for an entry the app never left (opened from its URL, or pushed and
// not left yet)
export const savedScrollOfEntry = (): number => {
  const state: unknown = window.history.state
  return isScrollState(state) ? state.scrollY : 0
}

// Once at boot: the app restores the scroll itself
export const manualScrollRestorationCmd = (): Cmd<{ _tag: 'NoOp' }> =>
  cmdSucceed(() => {
    window.history.scrollRestoration = 'manual'
  })

// URL writes
// ---------------------------------------------
//
// Called only by the URL writer of the program (`urlWriterOf`), before
// React draws the step: not commands, which run after the render, when the
// page is already the next one.

// Adds `url` as a new entry (no `popstate` fires for it), and the entry it
// leaves keeps the scroll of the page first
export const pushUrl = (url: string): void => {
  saveScrollOfEntry()
  window.history.pushState(null, '', url)
}

// Changes the entry shown to `url` (no `popstate` fires for it), and the
// entry keeps its saved scroll
export const replaceUrl = (url: string): void => {
  const state: unknown = window.history.state
  window.history.replaceState(state, '', url)
}

// A step down the screen stack (an entry page closed onto its list):
// when the entry right under the current one holds `url`, the
// browser goes back to it, so the in-app back and the browser's back are
// the same step and the page closed is not pushed over the one it covered.
// Its landing comes back as `UrlChanged` to the destination already shown,
// which changes nothing: the step drew the list at its scroll already.
// Otherwise (the page was opened from a shared link, or the browser has no
// Navigation API) it pushes, as any move. Either way the entry it leaves
// keeps the scroll of the page, for a forward back to it. Read when the
// write runs, not in the step.
export const backOrPushUrl = (url: string): void => {
  const below = entryBelowUrl()
  if (below !== undefined && sameUrl(url, below)) {
    saveScrollOfEntry()
    window.history.back()
  } else {
    pushUrl(url)
  }
}
