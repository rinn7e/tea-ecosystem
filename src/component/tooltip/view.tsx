import { cn } from '@rinn7e/tea-cup-prelude'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

import { type Anchor, type LegendRow, type Model, type Tooltip } from './type'

// The tooltip has one width, so it can be placed from its anchor alone:
// wider with a legend, which also needs more room above its trigger
export const WIDTH = 300
export const LEGEND_WIDTH = 400
const LEGEND_ROOM_ABOVE = 340
// Its gap to the trigger, and the least room it keeps to the screen edges
const GAP = 8
const MARGIN = 8
// Below this much room above the trigger, it opens below instead
const ROOM_ABOVE = 120

const clamp = (min: number, max: number, value: number): number =>
  Math.min(max, Math.max(min, value))

type Placement = {
  side: 'above' | 'below'
  // The box: its left edge, and its top (or bottom edge, above)
  left: number
  top: number
  // The arrow, from the left edge of the box: on the middle of the trigger
  arrowLeft: number
}

export const placementOf = (anchor: Anchor, hasLegend = false): Placement => {
  const width = hasLegend ? LEGEND_WIDTH : WIDTH
  const middle = (anchor.left + anchor.right) / 2
  const left = clamp(
    MARGIN,
    Math.max(MARGIN, anchor.viewportWidth - MARGIN - width),
    middle - width / 2,
  )
  const side =
    anchor.top >= (hasLegend ? LEGEND_ROOM_ABOVE : ROOM_ABOVE)
      ? 'above'
      : 'below'
  return {
    side,
    left,
    top: side === 'above' ? anchor.top - GAP : anchor.bottom + GAP,
    arrowLeft: clamp(10, width - 10, middle - left),
  }
}

const legendView = ({ rows }: { rows: LegendRow[] }) => (
  <span className='border-line flex flex-col gap-[6px] border-t pt-[10px]'>
    {rows.map((row) => (
      <span
        key={row.label}
        className={cn(
          'grid grid-cols-[88px_1fr] items-start gap-[10px]',
          !row.isCurrent && 'opacity-45',
        )}
      >
        <span
          className={cn(
            'inline-flex h-[22px] items-center justify-center rounded-[2px] border text-xs',
            row.badgeClassName,
          )}
        >
          {row.label}
        </span>
        <span className='text-ink-muted text-[0.8125rem] leading-snug'>
          {row.text}
        </span>
      </span>
    ))}
  </span>
)

// A darker grey border and a harder offset shadow than the cards, so it
// stands apart from them. Fixed to the screen, so it sits over everything
// without a portal. Its place comes from the model, so it is set with
// `style` (no class can hold a measured position).
//
// The outer box holds the place; the inner one moves. It comes in by
// fading in and rising 4px from its trigger (`starting:`, CSS alone, as
// nothing waits for it), and goes out the same way back while the model
// keeps it `leaving` until `Removed`. No motion with reduced motion.
const tooltipBoxView = ({ tooltip }: { tooltip: Tooltip }) => {
  const legend = tooltip.content.legend ?? []
  const placement = placementOf(tooltip.anchor, legend.length > 0)
  const isLeaving = tooltip.phase === 'leaving'
  const isAbove = placement.side === 'above'
  return (
    <div
      role='tooltip'
      id={`tooltip-${tooltip.id}`}
      className={cn(
        'pointer-events-none fixed z-50',
        isAbove && '-translate-y-full',
      )}
      style={{
        left: placement.left,
        top: placement.top,
        width: legend.length > 0 ? LEGEND_WIDTH : WIDTH,
      }}
    >
      <div
        className={cn(
          'border-ink-faint bg-panel text-ink offset-shadow-strong relative flex flex-col gap-[4px] rounded-[3px] border px-[14px] py-[10px] text-sm leading-snug',
          'transition-[opacity,translate] duration-150 ease-out motion-reduce:transition-none',
          isAbove
            ? 'starting:translate-y-[4px]'
            : 'starting:translate-y-[-4px]',
          'starting:opacity-0',
          isLeaving
            ? cn(
                'opacity-0',
                isAbove ? 'translate-y-[4px]' : 'translate-y-[-4px]',
              )
            : 'translate-y-0 opacity-100',
        )}
      >
        <span className='text-[0.9375rem]'>{tooltip.content.title}</span>
        <span className='text-ink-muted'>{tooltip.content.text}</span>
        {legend.length > 0 && legendView({ rows: legend })}
        <span
          aria-hidden='true'
          className={cn(
            'border-ink-faint bg-panel absolute size-[10px] -translate-x-1/2 rotate-45',
            isAbove
              ? 'bottom-[-6px] border-r border-b'
              : 'top-[-6px] border-t border-l',
          )}
          style={{ left: placement.arrowLeft }}
        />
      </div>
    </div>
  )
}

export const tooltipLayerView = ({ model }: { model: Model }) =>
  pipe(
    model.tooltip,
    O.filter((t) => t.phase !== 'waiting'),
    O.fold(
      () => null,
      (tooltip) => tooltipBoxView({ tooltip }),
    ),
  )
