import { WindowEvents } from 'react-tea-cup'
import { Sub } from 'tea-cup-fp'

import { type ListingFilter } from '@/common/type/destination'

import { type Model, type Msg } from './type'

const windowEvents = new WindowEvents<Msg>()

// The popover and its Filters button mark themselves with this attribute,
// so a press on them is not a press outside
export const PANEL_ATTRIBUTE = 'data-filter-panel'

const isInsidePanel = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(`[${PANEL_ATTRIBUTE}]`) !== null

export const subscriptions = <F extends ListingFilter>(
  model: Model<F>,
): Sub<Msg> =>
  model.panel === 'open'
    ? Sub.batch([
        windowEvents.on('keydown', (e): Msg => ({
          _tag: 'PanelKeyDown',
          key: e.key,
        })),
        windowEvents.on('pointerdown', (e): Msg => ({
          _tag: 'PanelPointerDown',
          isInside: isInsidePanel(e.target),
        })),
      ])
    : Sub.none()
