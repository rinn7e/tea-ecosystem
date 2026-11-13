import { cn } from '@rinn7e/tea-cup-prelude'
import { IconChevronLeft } from '@tabler/icons-react'
import type React from 'react'

import { type Destination } from '@/common/type/destination'

import { Link } from './link'

// The shape of every floating button: a circle with a 2px border
const floatingShapeClass =
  'flex size-[44px] cursor-pointer items-center justify-center rounded-full border-2 transition-[opacity,transform,border-color,background-color] duration-150 motion-reduce:transition-none lg:size-[48px]'

// Solid, for back to the top: a blue circle with a brighter border under
// the pointer
export const floatingButtonClass = cn(
  floatingShapeClass,
  'bg-bar text-bar-ink border-bar-ink/40 hover:border-bar-ink',
)

// Outline, for back: the panel inside a blue border, like the outline
// buttons of the lists (the layout not chosen)
const floatingOutlineClass = cn(
  floatingShapeClass,
  'border-edge bg-panel text-accent hover:bg-field',
)

// The floating buttons, fixed near the bottom of the window on the edges of
// the 1080px frame of the bar, the lists and the footer: back on the left,
// back to the top on the right, mirrored on the axis (back only below
// `lg:`). On a phone they sit above the tab bar. The frame lets presses through; only the buttons take
// them, so each one sets `pointer-events-auto` while it is shown.
export const floatingFrameView = ({
  start,
  end,
}: {
  start: React.ReactNode
  end: React.ReactNode
}) => (
  <div className='pointer-events-none fixed inset-x-0 bottom-[76px] z-30 flex justify-center px-[16px] lg:bottom-[32px]'>
    <div className='flex w-full max-w-[1080px] items-end justify-between'>
      {/* An empty start keeps the end on the right */}
      <div>{start}</div>
      <div>{end}</div>
    </div>
  </div>
)

// Back to the screen under the one shown (`backOf`): a link, like the one
// at the top of the page, so the list comes back with its filters and its
// scroll. On phones and tablets only, where that link is far up a long
// page; a desktop keeps the link at the top and the browser's back.
export const floatingBackView = ({
  destination,
  label,
}: {
  destination: Destination
  label: string
}) => (
  <Link
    destination={destination}
    aria-label={label}
    className={cn(floatingOutlineClass, 'pointer-events-auto lg:hidden')}
  >
    <IconChevronLeft size={24} stroke={2} aria-hidden />
  </Link>
)
