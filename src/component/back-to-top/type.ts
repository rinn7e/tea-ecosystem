export type Model = { isShown: boolean }

export type Msg =
  | { _tag: 'NoOp' }
  | { _tag: 'Scrolled'; scrollY: number }
  | { _tag: 'ScrollToTop' }
