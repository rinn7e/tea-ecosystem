import { cn } from '@rinn7e/tea-cup-prelude'
import { IconArrowUp } from '@tabler/icons-react'
import { type Dispatcher } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

// The 1080px frame lines the circle up with the right edge of the bar, the
// lists and the footer. On a phone it sits above the tab bar (60px,
// `BottomNavMemo`). The frame lets presses through, only the circle takes
// them.
export const backToTopView = ({
  model,
  dispatch,
}: {
  model: Model
  dispatch: Dispatcher<Msg>
}) => (
  <div className='pointer-events-none fixed inset-x-0 bottom-[76px] z-30 flex justify-center px-[16px] lg:bottom-[32px]'>
    <div className='flex w-full max-w-[1080px] justify-end'>
      <button
        type='button'
        aria-label='Back to top'
        aria-hidden={!model.isShown}
        tabIndex={model.isShown ? 0 : -1}
        onClick={() => dispatch({ _tag: 'ScrollToTop' })}
        className={cn(
          'bg-bar text-bar-ink border-bar-ink/40 hover:border-bar-ink flex size-[44px] cursor-pointer items-center justify-center rounded-full border-2 transition-[opacity,transform,border-color] duration-150 motion-reduce:transition-none lg:size-[48px]',
          model.isShown
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'translate-y-[8px] opacity-0',
        )}
      >
        <IconArrowUp size={22} stroke={2} aria-hidden />
      </button>
    </div>
  </div>
)
