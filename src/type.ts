import { type Brand } from '@/common/type/brand-wrapper'
import {
  type Destination,
  type NavigationMsg,
  type Screen,
  aboutScreen,
  adjacentScreen,
  buildScreen,
  catalogScreen,
  frameworkScreen,
  notFoundScreen,
  rubricScreen,
} from '@/common/type/destination'
import type * as BackToTop from '@/component/back-to-top'
import type * as Listing from '@/component/listing'
import type * as Tooltip from '@/component/tooltip'
import type * as BuildScreen from '@/screen/build-screen'
import type * as FrameworkScreen from '@/screen/framework-screen'

// The screen shown, as its model. Its tag and its own fields are the
// destination's screen (`currentScreenOf`). The two lists have no model
// here: each is a base layer of the stack, kept in `Model.catalog` and
// `Model.adjacent` while an entry page covers it.
export type ScreenModel =
  | { _tag: 'CatalogScreenModel' }
  | { _tag: 'FrameworkScreenModel'; model: FrameworkScreen.Model }
  | { _tag: 'RubricScreenModel' }
  | { _tag: 'AboutScreenModel' }
  | { _tag: 'AdjacentScreenModel' }
  | { _tag: 'BuildScreenModel'; model: BuildScreen.Model }
  | { _tag: 'NotFoundScreenModel' }

// The screen shown (`Model.screenModel`). Owned: read it anywhere as a
// `ScreenModel`, but only the two functions below make one (the brand has
// no value). So the screen changes only by a move; its own messages change
// its model in place. Review: a cast to it outside this file changes the
// screen without a move.
declare class _CurrentScreenModelBrand {
  private _currentScreenModelBrand(): void
}

export type CurrentScreenModel = Brand<ScreenModel, _CurrentScreenModelBrand>

// The screen model a move opens. Review: called by the navigation
// (`navigation-handler.ts`) and tests only (lint); anywhere else it changes
// the screen without the move.
export const currentScreenModelOfMove =
  (_destination: Destination) =>
  (screenModel: ScreenModel): CurrentScreenModel =>
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    screenModel as CurrentScreenModel

// The screen shown with its model changed in place by its own messages.
// Another screen keeps the one shown: that is a move.
export const sameScreenWith =
  (current: CurrentScreenModel) =>
  (screenModel: ScreenModel): CurrentScreenModel =>
    screenModel._tag === current._tag
      ? // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        (screenModel as CurrentScreenModel)
      : current

export type Model = {
  // The base layers of the screen stack, one per list: alive under every
  // screen
  catalog: Listing.Model
  adjacent: Listing.Model
  screenModel: CurrentScreenModel
  // The one tooltip of the app, over every screen
  tooltip: Tooltip.Model
  // The floating button back to the top, over every screen
  backToTop: BackToTop.Model
}

export type Msg =
  | { _tag: 'NoOp' }
  | { _tag: 'NavigationMsg'; subMsg: NavigationMsg }
  | { _tag: 'CatalogScreenMsg'; subMsg: Listing.Msg }
  | { _tag: 'AdjacentScreenMsg'; subMsg: Listing.Msg }
  | { _tag: 'BuildScreenMsg'; subMsg: BuildScreen.Msg }
  | { _tag: 'TooltipMsg'; subMsg: Tooltip.Msg }
  | { _tag: 'BackToTopMsg'; subMsg: BackToTop.Msg }

// The screen shown (the destination's `screen`, `destinationOf`), read from
// the fields of the models that hold its params
export const currentScreenOf = (model: Model): Screen => {
  const { screenModel } = model
  switch (screenModel._tag) {
    case 'CatalogScreenModel':
      return catalogScreen(model.catalog.filter)
    case 'FrameworkScreenModel':
      return frameworkScreen(screenModel.model.framework.id)
    case 'RubricScreenModel':
      return rubricScreen()
    case 'AboutScreenModel':
      return aboutScreen()
    case 'AdjacentScreenModel':
      return adjacentScreen(model.adjacent.filter)
    case 'BuildScreenModel':
      return buildScreen(screenModel.model.language)
    case 'NotFoundScreenModel':
      return notFoundScreen()
  }
}
