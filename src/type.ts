import { type ListId } from '@/common/data/catalog'
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
import type * as Tooltip from '@/component/tooltip'
import type * as AboutScreen from '@/screen/about-screen'
import type * as AdjacentScreen from '@/screen/adjacent-screen'
import type * as BuildScreen from '@/screen/build-screen'
import type * as CatalogScreen from '@/screen/catalog-screen'
import type * as FrameworkScreen from '@/screen/framework-screen'
import type * as RubricScreen from '@/screen/rubric-screen'

// Its tag and its own fields are the destination's screen
// (`currentScreenOf`). The two list screens keep their model elsewhere:
// each is a base layer of the stack, kept in `Model.catalog` and
// `Model.adjacent` while an entry page covers it.
export type ScreenModel =
  | { _tag: 'CatalogScreenModel' }
  | { _tag: 'FrameworkScreenModel'; model: FrameworkScreen.Model }
  | { _tag: 'RubricScreenModel'; model: RubricScreen.Model }
  | { _tag: 'AboutScreenModel'; model: AboutScreen.Model }
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
  // The base layers of the screen stack, the model of each list screen:
  // alive under every screen
  catalog: CatalogScreen.Model
  adjacent: AdjacentScreen.Model
  screenModel: CurrentScreenModel
  tooltip: Tooltip.Model
  backToTop: BackToTop.Model
  // The scroll each list was left at by a link, where the step back down
  // onto it draws it
  listScrollY: Record<ListId, number>
  // Where the screen shown is drawn: set by every move, and scrolled to
  // once per `seq`, before the browser paints the screen (`useScrollOf`)
  scroll: { seq: number; top: number }
  // The width of the window (`windowWidthChanges`): how many language
  // logos fit in a row
  windowWidth: number
  // The time (ms since 1970), kept to the minute: how long ago the site
  // last changed, in the bar
  now: number
}

export type Msg =
  | { _tag: 'NoOp' }
  | { _tag: 'NavigationMsg'; subMsg: NavigationMsg }
  | { _tag: 'CatalogScreenMsg'; subMsg: CatalogScreen.Msg }
  | { _tag: 'RubricScreenMsg'; subMsg: RubricScreen.Msg }
  | { _tag: 'AboutScreenMsg'; subMsg: AboutScreen.Msg }
  | { _tag: 'AdjacentScreenMsg'; subMsg: AdjacentScreen.Msg }
  | { _tag: 'BuildScreenMsg'; subMsg: BuildScreen.Msg }
  | { _tag: 'TooltipMsg'; subMsg: Tooltip.Msg }
  | { _tag: 'BackToTopMsg'; subMsg: BackToTop.Msg }
  | { _tag: 'SetWindowWidth'; value: number }
  | { _tag: 'SetNow'; value: number }

// The screen shown (the destination's `screen`, `destinationOf`), read from
// the fields of the models that hold its params
export const currentScreenOf = (model: Model): Screen => {
  const { screenModel } = model
  switch (screenModel._tag) {
    case 'CatalogScreenModel':
      return catalogScreen(model.catalog.listing.filter)
    case 'FrameworkScreenModel':
      return frameworkScreen(screenModel.model.framework.id)
    case 'RubricScreenModel':
      return rubricScreen()
    case 'AboutScreenModel':
      return aboutScreen()
    case 'AdjacentScreenModel':
      return adjacentScreen(model.adjacent.listing.filter)
    case 'BuildScreenModel':
      return buildScreen(screenModel.model.language)
    case 'NotFoundScreenModel':
      return notFoundScreen()
  }
}
