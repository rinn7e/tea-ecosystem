import { cn } from '@rinn7e/tea-cup-prelude'
import { IconArrowUp } from '@tabler/icons-react'
import { type Dispatcher } from 'tea-cup-fp'

import { floatingButtonClass } from '@/component/floating-button'

import { type Model, type Msg } from './type'

// The circle on the right of the floating frame (`floatingFrameView`).
// Hidden, it fades out and stays out of reach of the mouse, the keyboard
// and screen readers.
export const backToTopView = ({
  model,
  dispatch,
}: {
  model: Model
  dispatch: Dispatcher<Msg>
}) => (
  <button
    type='button'
    aria-label='Back to top'
    aria-hidden={!model.isShown}
    tabIndex={model.isShown ? 0 : -1}
    onClick={() => dispatch({ _tag: 'ScrollToTop' })}
    className={cn(
      floatingButtonClass,
      model.isShown
        ? 'pointer-events-auto translate-y-0 opacity-100'
        : 'translate-y-[8px] opacity-0',
    )}
  >
    <IconArrowUp size={22} stroke={2} aria-hidden />
  </button>
)
