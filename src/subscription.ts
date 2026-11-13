import { Sub, Time } from 'tea-cup-fp'

import { windowWidthChanges } from '@/common/util/window-width'
import * as BackToTop from '@/component/back-to-top'
import * as Listing from '@/component/listing'
import * as Tooltip from '@/component/tooltip'

import { type Model, type Msg } from './type'

// What the app listens to beyond its own events: the keys, scrolls and
// presses that close an open tooltip, those that close the Filters
// popover of the list shown, the scroll that shows the button back to the
// top, the resize that changes how many language logos fit in a row, and
// the minute that changes how long ago the site last changed
export const subscriptions = (model: Model): Sub<Msg> =>
  Sub.batch([
    windowWidthChanges<Msg>((value) => ({ _tag: 'SetWindowWidth', value }), {
      _tag: 'NoOp',
    }),
    // The time, once a minute, so how long ago the site changed stays true
    Time.every(60_000, (): Msg => ({ _tag: 'SetNow', value: Date.now() })),
    BackToTop.subscriptions(model.backToTop).map((subMsg): Msg => ({
      _tag: 'BackToTopMsg',
      subMsg,
    })),
    Tooltip.subscriptions(model.tooltip).map((subMsg): Msg => ({
      _tag: 'TooltipMsg',
      subMsg,
    })),
    model.screenModel._tag === 'CatalogScreenModel'
      ? Listing.subscriptions(model.catalog).map((subMsg): Msg => ({
          _tag: 'CatalogScreenMsg',
          subMsg,
        }))
      : model.screenModel._tag === 'AdjacentScreenModel'
        ? Listing.subscriptions(model.adjacent).map((subMsg): Msg => ({
            _tag: 'AdjacentScreenMsg',
            subMsg,
          }))
        : Sub.none(),
  ])
