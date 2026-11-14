import { DocumentEvents, WindowEvents } from 'react-tea-cup'
import { Sub } from 'tea-cup-fp'

import { pageWidth } from './page-scroll'

// The width of the window, kept in the root model (`windowWidth`): read in
// `init` and on every change, so views read it from the model. It is the
// width the page lays out in (`clientWidth`, without the scrollbar), not
// `window.innerWidth`: on a phone that one grows with content wider than
// the screen, so a row too wide would make itself wider.

// The breakpoints of the CSS: `tablet:` (`src/asset/index.css`) and `lg:`.
// A media query counts the scrollbar and `windowWidth` does not, so near a
// breakpoint the two can disagree by its width (16px at most).
export const breakpoints = {
  tablet: 640,
  lg: 1024,
}

export const windowWidthOf = (): number => pageWidth()

const windowEvents = new WindowEvents()
const documentEvents = new DocumentEvents()

// The width of the window each time it changes. A hidden page is not the
// width the user sees: iOS resizes a home-screen app in the background
// (for the snapshots of the app switcher) and may not resize it back
// before it is shown again. So a resize while hidden is dropped
// (`whileHidden`), and the width is read again when the page shows.
export const windowWidthChanges = <Msg>(
  toMsg: (windowWidth: number) => Msg,
  whileHidden: Msg,
): Sub<Msg> => {
  const read = (): Msg =>
    document.visibilityState === 'hidden' ? whileHidden : toMsg(windowWidthOf())
  return Sub.batch<Msg>([
    windowEvents.on('resize', read),
    documentEvents.on('visibilitychange', read),
  ])
}
