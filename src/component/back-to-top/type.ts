// The floating button that scrolls back to the top: shown once the page is
// scrolled down far enough
export type Model = { isShown: boolean }

export type Msg =
  | { _tag: 'NoOp' }
  | { _tag: 'Scrolled'; scrollY: number }
  | { _tag: 'ScrollToTop' }
