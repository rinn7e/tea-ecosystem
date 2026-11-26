import { vi } from 'vitest'

import { PAGE_SCROLL_ID } from '@/common/util'

// The tests run in Node, with no DOM: a fake of the parts of the browser
// the URL writer touches (the history with the state of each entry, the
// Navigation API, the box the page scrolls in), put in `window` and
// `document` with `vi.stubGlobal`. Undo it with `vi.unstubAllGlobals`.

type Entry = { readonly path: string; readonly state: unknown }

export type FakeBrowser = {
  // The page box scrolled to `top`
  readonly scrollPageTo: (top: number) => void
  // Every entry of the history, in order
  readonly entries: () => readonly Entry[]
  // The index of the entry shown
  readonly index: () => number
  // How many times the history was written (a push, a replace, a back)
  readonly writes: () => number
}

const ORIGIN = 'http://localhost'

// A browser that opened `path`, with `state` in its entry
export const fakeBrowserOn = (
  path: string,
  state: unknown = null,
): FakeBrowser => {
  let entries: Entry[] = [{ path, state }]
  let index = 0
  let writes = 0
  const box = { scrollTop: 0 }
  const current = (): Entry => entries[index] ?? { path, state: null }

  const history = {
    get state(): unknown {
      return current().state
    },
    pushState: (next: unknown, _unused: string, url: string) => {
      writes += 1
      entries = [...entries.slice(0, index + 1), { path: url, state: next }]
      index = entries.length - 1
    },
    replaceState: (next: unknown, _unused: string, url?: string) => {
      writes += 1
      entries = entries.map((entry, i) =>
        i === index ? { path: url ?? entry.path, state: next } : entry,
      )
    },
    // The real one lands later, with a `popstate` the test sends itself
    back: () => {
      writes += 1
      index = Math.max(0, index - 1)
    },
  }
  const navigation = {
    get currentEntry() {
      return { index }
    },
    entries: () => entries.map((entry) => ({ url: ORIGIN + entry.path })),
  }

  vi.stubGlobal('window', {
    history,
    navigation,
    location: { origin: ORIGIN },
  })
  vi.stubGlobal('document', {
    getElementById: (id: string) => (id === PAGE_SCROLL_ID ? box : null),
  })

  const browser: FakeBrowser = {
    scrollPageTo: (top) => {
      box.scrollTop = top
    },
    entries: () => entries,
    index: () => index,
    writes: () => writes,
  }
  return browser
}
