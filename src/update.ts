import { Cmd } from 'tea-cup-fp'

import { defaultListingFilter } from '@/common/type/destination'
import { manualScrollRestorationCmd } from '@/common/util'
import * as BackToTop from '@/component/back-to-top'
import * as Listing from '@/component/listing'
import * as Tooltip from '@/component/tooltip'
import {
  navigationMsgHandler,
  openDestination,
  setTitleCmd,
} from '@/handler/navigation-handler'
import * as AboutScreen from '@/screen/about-screen'
import * as BuildScreen from '@/screen/build-screen'
import * as RubricScreen from '@/screen/rubric-screen'
import { type Model, type Msg, sameScreenWith } from '@/type'
import { bootDestinationOf } from '@/util'

// Init, Update
// ---------------------------------------------

// The data is bundled, so the app opens its first screen at once, at the
// width of the window and the time (read in `program.tsx`)
export const init = (
  location: Pick<Location, 'href'>,
  windowWidth: number,
  now: number,
): [Model, Cmd<Msg>] => {
  const model: Model = {
    ...openDestination(bootDestinationOf(location), {
      catalog: Listing.init(defaultListingFilter()),
      adjacent: Listing.init(defaultListingFilter()),
    }),
    tooltip: Tooltip.init(),
    backToTop: BackToTop.init(),
    listScrollY: { catalog: 0, adjacent: 0 },
    scroll: { seq: 0, top: 0 },
    windowWidth,
    now,
  }
  return [
    model,
    Cmd.batch([
      setTitleCmd(model),
      manualScrollRestorationCmd().map((noOp): Msg => noOp),
    ]),
  ]
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'NoOp':
      return [model, Cmd.none()]
    case 'NavigationMsg':
      return navigationMsgHandler(msg.subMsg, model)
    case 'CatalogScreenMsg':
      return catalogScreenMsgHandler(msg.subMsg, model)
    case 'RubricScreenMsg':
      return rubricScreenMsgHandler(msg.subMsg, model)
    case 'AboutScreenMsg':
      return aboutScreenMsgHandler(msg.subMsg, model)
    case 'AdjacentScreenMsg':
      return adjacentScreenMsgHandler(msg.subMsg, model)
    case 'BuildScreenMsg':
      return buildScreenMsgHandler(msg.subMsg, model)
    case 'TooltipMsg':
      return tooltipMsgHandler(msg.subMsg, model)
    case 'BackToTopMsg':
      return backToTopMsgHandler(msg.subMsg, model)
    // The same model while the width is the same, so a resize that changes
    // nothing draws nothing new
    case 'SetNow':
      return [{ ...model, now: msg.value }, Cmd.none()]
    case 'SetWindowWidth':
      return [
        msg.value === model.windowWidth
          ? model
          : { ...model, windowWidth: msg.value },
        Cmd.none(),
      ]
  }
}

// Child Msg handlers
// ---------------------------------------------

// The catalog changes only while it is shown; its filter is the
// destination's, so the URL follows after the step
const catalogScreenMsgHandler = (
  subMsg: Listing.Msg,
  model: Model,
): [Model, Cmd<Msg>] => {
  if (model.screenModel._tag === 'CatalogScreenModel') {
    const [catalog, catalogCmd] = Listing.update(subMsg, model.catalog)
    return [
      { ...model, catalog },
      catalogCmd.map((m): Msg => ({ _tag: 'CatalogScreenMsg', subMsg: m })),
    ]
  } else {
    return [model, Cmd.none()]
  }
}

const rubricScreenMsgHandler = (
  subMsg: RubricScreen.Msg,
  model: Model,
): [Model, Cmd<Msg>] => {
  const { screenModel } = model
  if (screenModel._tag === 'RubricScreenModel') {
    const [rubricModel, rubricCmd] = RubricScreen.update(
      subMsg,
      screenModel.model,
    )
    return [
      {
        ...model,
        screenModel: sameScreenWith(screenModel)({
          _tag: 'RubricScreenModel',
          model: rubricModel,
        }),
      },
      rubricCmd.map((m): Msg => ({ _tag: 'RubricScreenMsg', subMsg: m })),
    ]
  } else {
    return [model, Cmd.none()]
  }
}

const aboutScreenMsgHandler = (
  subMsg: AboutScreen.Msg,
  model: Model,
): [Model, Cmd<Msg>] => {
  const { screenModel } = model
  if (screenModel._tag === 'AboutScreenModel') {
    const [aboutModel, aboutCmd] = AboutScreen.update(subMsg, screenModel.model)
    return [
      {
        ...model,
        screenModel: sameScreenWith(screenModel)({
          _tag: 'AboutScreenModel',
          model: aboutModel,
        }),
      },
      aboutCmd.map((m): Msg => ({ _tag: 'AboutScreenMsg', subMsg: m })),
    ]
  } else {
    return [model, Cmd.none()]
  }
}

// The adjacent list, the same way
const adjacentScreenMsgHandler = (
  subMsg: Listing.Msg,
  model: Model,
): [Model, Cmd<Msg>] => {
  if (model.screenModel._tag === 'AdjacentScreenModel') {
    const [adjacent, adjacentCmd] = Listing.update(subMsg, model.adjacent)
    return [
      { ...model, adjacent },
      adjacentCmd.map((m): Msg => ({ _tag: 'AdjacentScreenMsg', subMsg: m })),
    ]
  } else {
    return [model, Cmd.none()]
  }
}

const buildScreenMsgHandler = (
  subMsg: BuildScreen.Msg,
  model: Model,
): [Model, Cmd<Msg>] => {
  const { screenModel } = model
  if (screenModel._tag === 'BuildScreenModel') {
    const [buildModel, buildCmd] = BuildScreen.update(subMsg, screenModel.model)
    return [
      {
        ...model,
        screenModel: sameScreenWith(screenModel)({
          _tag: 'BuildScreenModel',
          model: buildModel,
        }),
      },
      buildCmd.map((m): Msg => ({ _tag: 'BuildScreenMsg', subMsg: m })),
    ]
  } else {
    return [model, Cmd.none()]
  }
}

// The tooltip of the app, over whatever screen is shown
const tooltipMsgHandler = (
  subMsg: Tooltip.Msg,
  model: Model,
): [Model, Cmd<Msg>] => {
  const [tooltip, tooltipCmd] = Tooltip.update(subMsg, model.tooltip)
  return [
    { ...model, tooltip },
    tooltipCmd.map((m): Msg => ({ _tag: 'TooltipMsg', subMsg: m })),
  ]
}

// The button back to the top, over whatever screen is shown
const backToTopMsgHandler = (
  subMsg: BackToTop.Msg,
  model: Model,
): [Model, Cmd<Msg>] => {
  const [backToTop, backToTopCmd] = BackToTop.update(subMsg, model.backToTop)
  return [
    backToTop === model.backToTop ? model : { ...model, backToTop },
    backToTopCmd.map((m): Msg => ({ _tag: 'BackToTopMsg', subMsg: m })),
  ]
}
