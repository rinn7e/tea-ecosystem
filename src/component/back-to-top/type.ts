// `glides`: a change of `isShown` fades in or out, as when the page is
// scrolled past `SHOWN_FROM`; after a move it is instant, so a list a swipe
// back returns to shows the button at once, as the snapshot of the page
// Safari drew during the swipe did
export type Model = { isShown: boolean; glides: boolean }

export type Msg =
  | { _tag: 'NoOp' }
  | { _tag: 'Scrolled'; scrollY: number }
  | { _tag: 'ScrollToTop' }
