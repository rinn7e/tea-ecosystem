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
// click (`saveScrollOfEntry`), and read after the next paint once the app
// lands on it. Not in the URL commands: they run after the next screen is
// drawn, when the scroll is already clamped to it.

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

// Runs `effect` once the browser has painted what the step drew: two
// animation frames, or 100 ms where frames do not run (a hidden tab)
const afterNextPaint = (effect: () => void): void => {
  const run = { done: false }
  const once = () => {
    if (!run.done) {
      run.done = true
      effect()
    }
  }
  requestAnimationFrame(() => requestAnimationFrame(once))
  setTimeout(once, 100)
}

// Once at boot: the app restores the scroll itself
export const manualScrollRestorationCmd = (): Cmd<{ _tag: 'NoOp' }> =>
  cmdSucceed(() => {
    window.history.scrollRestoration = 'manual'
  })

// After landing on a history entry (the browser's back or forward, or the
// app's own back): its saved scroll, once its screen is drawn
export const restoreScrollCmd = (): Cmd<{ _tag: 'NoOp' }> =>
  cmdSucceed(() => {
    afterNextPaint(() => {
      const state: unknown = window.history.state
      window.scrollTo({ top: isScrollState(state) ? state.scrollY : 0 })
    })
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
// which restores the scroll of the catalog. Otherwise (the page was opened
// from a shared link, or the browser has no Navigation API) it pushes, as
// any move, at the top. Read when the write runs, not in the step.
export const backOrPushUrlCmd = (url: string): Cmd<{ _tag: 'NoOp' }> =>
  cmdSucceed(() => {
    const below = entryBelowUrl()
    if (below !== undefined && sameUrl(url, below)) {
      window.history.back()
    } else {
      window.history.pushState(null, '', url)
      window.scrollTo({ top: 0 })
    }
  })
