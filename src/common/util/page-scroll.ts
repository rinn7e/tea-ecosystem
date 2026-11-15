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

// Safari on a phone keeps a flicked box gliding after a jump, so a tap on
// a link mid-glide showed the new page at its place for a frame and then
// slid on. The box stops scrolling for one frame first, which ends the
// glide, then scrolls again (and glides to `top` when `behavior` says so).
export const scrollPageTo = (
  top: number,
  behavior: ScrollBehavior = 'auto',
): void => {
  const box = pageScrollBox()
  if (box !== null) {
    box.style.overflowY = 'hidden'
    // A smooth move starts from where the glide stopped
    box.scrollTo({ top: behavior === 'smooth' ? box.scrollTop : top })
    // On the next frame, or after a short wait in a tab that draws no
    // frames (hidden); the style is the flag, so it scrolls again once
    const resume = () => {
      if (box.style.overflowY === 'hidden') {
        box.style.overflowY = ''
        if (behavior === 'smooth') {
          box.scrollTo({ top, behavior })
        }
      }
    }
    requestAnimationFrame(resume)
    setTimeout(resume, 50)
  }
}

// The width the page lays out in: the box without its scrollbar, or the
// window before the box is drawn
export const pageWidth = (): number =>
  pageScrollBox()?.clientWidth ?? document.documentElement.clientWidth
