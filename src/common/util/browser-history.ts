import { cmdSucceed } from '@rinn7e/tea-cup-prelude'
import { type Cmd } from 'tea-cup-fp'

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

// The URL of the history entry right under the current one, when the
// browser can tell it
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
// Each entry keeps its own `scrollY` in its state, saved by `Link` at the
// click (`saveScrollOfEntry`) and read when the browser lands on it
// (`savedScrollOfEntry`, in `UrlChanged`). The step decides where the screen
// it shows is drawn (`Model.scroll`), and the app scrolls there after React
// has drawn that screen and before the browser paints it (`useScrollOf`), so
// the first frame of a list is already at its place. Not in the URL
// commands: they run before the next screen is drawn, when the page still
// has the height of the one it replaces.

type ScrollState = { readonly scrollY: number }

const isScrollState = (state: unknown): state is ScrollState =>
  typeof state === 'object' &&
  state !== null &&
  'scrollY' in state &&
  typeof state.scrollY === 'number'

// Saves the scroll of the history entry shown, before the app leaves it.
// Called by `Link` at the click, before the move is dispatched.
export const saveScrollOfEntry = (): void => {
  const state: ScrollState = { scrollY: window.scrollY }
  window.history.replaceState(state, '')
}

// The scroll saved in the history entry shown, 0 when it has none (an entry
// the app pushed and never left by a link)
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

// Adds `url` to the history as a new entry (no `popstate` fires for it)
export const pushUrlCmd = (url: string): Cmd<{ _tag: 'NoOp' }> =>
  cmdSucceed(() => {
    window.history.pushState(null, '', url)
  })

// Changes the history entry shown to `url` (no `popstate` fires for it),
// keeping its saved scroll
export const replaceUrlCmd = (url: string): Cmd<{ _tag: 'NoOp' }> =>
  cmdSucceed(() => {
    const state: unknown = window.history.state
    window.history.replaceState(state, '', url)
  })

// A step down the screen stack (an entry page closed onto its list):
// when the entry right under the current one holds `url`, the
// browser goes back to it, so the in-app back and the browser's back are
// the same step and the page closed is not pushed over the one it covered.
// Its landing comes back as `UrlChanged` to the destination already shown,
// which changes nothing: the step drew the list at its scroll already.
// Otherwise (the page was opened from a shared link, or the browser has no
// Navigation API) it pushes, as any move. Read when the write runs, not in
// the step.
export const backOrPushUrlCmd = (url: string): Cmd<{ _tag: 'NoOp' }> =>
  cmdSucceed(() => {
    const below = entryBelowUrl()
    if (below !== undefined && sameUrl(url, below)) {
      window.history.back()
    } else {
      window.history.pushState(null, '', url)
    }
  })
