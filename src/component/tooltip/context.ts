import { createContext } from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { type GlobalTooltipMsg } from './type'

// The root `dispatch`, so a trigger deep in a dumb view sends its messages
// without a `dispatch` passed down to it (as `Link` does for navigation).
// The root `dispatch` never changes, so the triggers do not draw again.
// No sensible default exists; the provider always supplies the real one.
export const TooltipDispatchContext = createContext<
  Dispatcher<GlobalTooltipMsg>
>(
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  null as any,
)
TooltipDispatchContext.displayName = 'TooltipDispatchContext'
