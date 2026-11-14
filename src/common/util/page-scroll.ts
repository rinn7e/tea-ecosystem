// The page scrolls inside one box (`PAGE_SCROLL_ID`, drawn by `App`), not
// the window, with the tab bar of a phone below it as a sibling: the
// window never scrolls, so Safari on a phone keeps its toolbar the same
// size, and the page never slides under the tab bar. Everything that reads
// or moves the scroll of the page goes through here.

export const PAGE_SCROLL_ID = 'page-scroll'

const pageScrollBox = (): HTMLElement | null =>
  document.getElementById(PAGE_SCROLL_ID)

// 0 before the box is drawn
export const pageScrollTop = (): number => pageScrollBox()?.scrollTop ?? 0

export const scrollPageTo = (
  top: number,
  behavior: ScrollBehavior = 'auto',
): void => {
  pageScrollBox()?.scrollTo({ top, behavior })
}

// The width the page lays out in: the box without its scrollbar, or the
// window before the box is drawn
export const pageWidth = (): number =>
  pageScrollBox()?.clientWidth ?? document.documentElement.clientWidth
