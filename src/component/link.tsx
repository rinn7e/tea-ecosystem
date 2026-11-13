import React, { useContext } from 'react'

import { SetGlobalMsgContext } from '@/common/global-context'
import { type Destination, toUrlString } from '@/common/type/destination'
import { saveScrollOfEntry } from '@/common/util'

// Not memoized: `children` is arbitrary JSX, which has no meaningful Eq
export type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  destination: Destination
  // A link back to the list under the page, which comes back at its scroll
  back?: boolean
  className?: string
  children: React.ReactNode
}

// A real anchor: a plain left click navigates in the app, a click with a
// modifier key or another button keeps the browser's behaviour (a new tab,
// copying the link). Part of the URL adapter: it saves the scroll of the
// entry it leaves at the click, before the next screen is drawn (see
// "Scroll" in `browser-history.ts`).
export const Link = ({
  destination,
  back = false,
  className,
  children,
  onClick,
  ...rest
}: LinkProps) => {
  const setGlobalMsg = useContext(SetGlobalMsgContext)

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (
      !e.defaultPrevented &&
      e.button === 0 &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.shiftKey &&
      !e.altKey
    ) {
      e.preventDefault()
      saveScrollOfEntry()
      setGlobalMsg({
        _tag: 'NavigationMsg',
        subMsg: {
          _tag: 'Navigate',
          destination,
          scrollY: window.scrollY,
          back,
        },
      })
    }
  }

  return (
    <a
      {...rest}
      href={toUrlString(destination)}
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  )
}
