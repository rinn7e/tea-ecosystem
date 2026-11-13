import { type Option } from 'fp-ts/Option'

// A tooltip in TEA: one at a time for the whole app, kept in the root
// model. Its content is data, not a view, so the model stays plain.
export type Content = {
  title: string
  text: string
  // A legend under the text, such as the grades of the rubric: each row a
  // badge (its label and classes) and what it means, the current one at
  // full strength
  legend?: LegendRow[]
}

export type LegendRow = {
  label: string
  text: string
  badgeClassName: string
  isCurrent: boolean
}

// Where the trigger is on the screen when the pointer reached it, and how
// wide the screen is then: enough to place the tooltip with no measuring
export type Anchor = {
  top: number
  bottom: number
  left: number
  right: number
  viewportWidth: number
}

// A tooltip on its way: `waiting` while the open delay runs, then `shown`,
// then `leaving` while it fades out, still drawn, until `Removed`
export type Tooltip = {
  id: string
  anchor: Anchor
  content: Content
  phase: 'waiting' | 'shown' | 'leaving'
}

export type Model = {
  tooltip: Option<Tooltip>
  // Counts every change, so a timer started for an older tooltip finds a
  // newer `seq` and does nothing
  seq: number
  // A tooltip was just shown: the next one opens at once, so moving along
  // a row of triggers does not wait at each one
  warm: boolean
}

export type Msg =
  // A mouse reached a trigger, or left it
  | { _tag: 'Hover'; id: string; anchor: Anchor; content: Content }
  | { _tag: 'Leave'; id: string }
  // A finger tapped a trigger: touch screens have no hover
  | { _tag: 'Tap'; id: string; anchor: Anchor; content: Content }
  | { _tag: 'DelayElapsed'; seq: number }
  | { _tag: 'CooledDown'; seq: number }
  // The fade out is over: the tooltip leaves the page
  | { _tag: 'Removed'; seq: number }
  // While one is open: a key, a scroll, a resize or a press elsewhere
  | { _tag: 'KeyDown'; key: string }
  | { _tag: 'Dismiss' }

// The root message that carries a tooltip message, so a trigger can send
// it through the root `dispatch` without knowing the root `Msg`
export type GlobalTooltipMsg = {
  readonly _tag: 'TooltipMsg'
  readonly subMsg: Msg
}
