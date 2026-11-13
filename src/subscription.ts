import { Sub } from 'tea-cup-fp'

import * as BackToTop from '@/component/back-to-top'
import * as Listing from '@/component/listing'
import * as Tooltip from '@/component/tooltip'

import { type Model, type Msg } from './type'

// What the app listens to beyond its own events: the keys, scrolls and
// presses that close an open tooltip, those that close the Filters
// popover of the list shown, and the scroll that shows the button back to
// the top
export const subscriptions = (model: Model): Sub<Msg> =>
  Sub.batch([
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
