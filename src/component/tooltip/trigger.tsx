import { type PointerEvent, type ReactNode, useContext } from 'react'

import { TooltipDispatchContext } from './context'
import { type Anchor, type Content, type Msg } from './type'

const anchorOf = (element: Element): Anchor => {
  const rect = element.getBoundingClientRect()
  return {
    top: rect.top,
    bottom: rect.bottom,
    left: rect.left,
    right: rect.right,
    viewportWidth: document.documentElement.clientWidth,
  }
}

// Something with a tooltip. A mouse opens it by resting on it; a finger by
// a tap, as touch screens have no hover, unless `touch` is off: around a
// button, a tap is for the button. `label` is what a screen reader reads
// for it, the tooltip being for the eye; a button names itself, so it is
// left out there.
//
// Around a button, `className` lays out the wrapper (`flex` for a box that
// fills a grid cell, `inline-flex` otherwise).
export const TooltipTrigger = ({
  id,
  content,
  label,
  touch = true,
  className,
  children,
}: {
  id: string
  content: Content
  label?: string
  touch?: boolean
  className?: string
  children: ReactNode
}) => {
  const dispatch = useContext(TooltipDispatchContext)
  const send = (subMsg: Msg) => dispatch({ _tag: 'TooltipMsg', subMsg })
  return (
    <span
      aria-label={label}
      className={className}
      onPointerEnter={(e: PointerEvent<HTMLSpanElement>) =>
        e.pointerType === 'mouse'
          ? send({
              _tag: 'Hover',
              id,
              anchor: anchorOf(e.currentTarget),
              content,
            })
          : undefined
      }
      onPointerLeave={(e: PointerEvent<HTMLSpanElement>) =>
        e.pointerType === 'mouse' ? send({ _tag: 'Leave', id }) : undefined
      }
      onPointerUp={(e: PointerEvent<HTMLSpanElement>) =>
        e.pointerType === 'mouse' || !touch
          ? undefined
          : send({
              _tag: 'Tap',
              id,
              anchor: anchorOf(e.currentTarget),
              content,
            })
      }
    >
      {children}
    </span>
  )
}
