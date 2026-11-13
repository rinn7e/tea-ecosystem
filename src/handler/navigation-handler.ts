import { cmdSucceed } from '@rinn7e/tea-cup-prelude'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { Cmd } from 'tea-cup-fp'

import { type ListKind, frameworkById } from '@/common/data/catalog'
import {
  type Destination,
  DestinationEq,
  type NavigationMsg,
  type Screen,
} from '@/common/type/destination'
import * as Listing from '@/component/listing'
import * as Tooltip from '@/component/tooltip'
import * as BuildScreen from '@/screen/build-screen'
import * as FrameworkScreen from '@/screen/framework-screen'
import {
  type Model,
  type Msg,
  type ScreenModel,
  currentScreenModelOfMove,
} from '@/type'
import { destinationOf, isScreenBelow } from '@/util'

// The two lists kept under every screen (the base layers of the stack)
export type Lists = Pick<Model, 'catalog' | 'adjacent'>

// The screen model of `destination`, the one place a move opens a screen.
// A list is opened with the destination's filter when the destination is
// that list, and kept as it is under any other screen. The overlays over
// every screen (the tooltip, the button back to the top) stay as they are,
// and so does the scroll, which the move sets.
// Review: called only by `navigationMsgHandler` and the boot.
export const openDestination = (
  destination: Destination,
  lists: Lists,
): Omit<
  Model,
  'tooltip' | 'backToTop' | 'listScrollY' | 'scroll' | 'windowWidth'
> => {
  const { screen } = destination
  const screenModel = ((): ScreenModel => {
    switch (screen._tag) {
      case 'CatalogScreen':
        return { _tag: 'CatalogScreenModel' }
      case 'FrameworkScreen':
        return pipe(
          frameworkById(screen.frameworkId),
          O.fold(
            (): ScreenModel => ({ _tag: 'NotFoundScreenModel' }),
            (framework): ScreenModel => ({
              _tag: 'FrameworkScreenModel',
              model: FrameworkScreen.init(framework),
            }),
          ),
        )
      case 'RubricScreen':
        return { _tag: 'RubricScreenModel' }
      case 'AboutScreen':
        return { _tag: 'AboutScreenModel' }
      case 'AdjacentScreen':
        return { _tag: 'AdjacentScreenModel' }
      case 'BuildScreen':
        return {
          _tag: 'BuildScreenModel',
          model: BuildScreen.init(screen.language),
        }
      case 'NotFoundScreen':
        return { _tag: 'NotFoundScreenModel' }
    }
  })()
  return {
    catalog:
      screen._tag === 'CatalogScreen'
        ? Listing.init(screen.filter)
        : lists.catalog,
    adjacent:
      screen._tag === 'AdjacentScreen'
        ? Listing.init(screen.filter)
        : lists.adjacent,
    screenModel: currentScreenModelOfMove(destination)(screenModel),
  }
}

const SITE_NAME = 'TEA Ecosystem'

const titleOf = (model: Model): string => {
  const { screenModel } = model
  switch (screenModel._tag) {
    case 'CatalogScreenModel':
      return SITE_NAME
    case 'FrameworkScreenModel':
      return `${screenModel.model.framework.name} | ${SITE_NAME}`
    case 'RubricScreenModel':
      return `Rubric | ${SITE_NAME}`
    case 'AboutScreenModel':
      return `About | ${SITE_NAME}`
    case 'AdjacentScreenModel':
      return `TEA-adjacent | ${SITE_NAME}`
    case 'BuildScreenModel':
      return `Build your own TEA | ${SITE_NAME}`
    case 'NotFoundScreenModel':
      return `Not found | ${SITE_NAME}`
  }
}

export const setTitleCmd = (model: Model): Cmd<Msg> =>
  cmdSucceed(() => {
    document.title = titleOf(model)
  })

// The list a screen is, if it is one
const listKindOf = (screen: Screen): O.Option<ListKind> => {
  switch (screen._tag) {
    case 'CatalogScreen':
      return O.some('catalog')
    case 'AdjacentScreen':
      return O.some('adjacent')
    case 'FrameworkScreen':
    case 'RubricScreen':
    case 'AboutScreen':
    case 'BuildScreen':
    case 'NotFoundScreen':
      return O.none
  }
}

// Every move of the app. The URL follows the destination after the step
// (`withUrl`), so nothing here writes it. Each move also says where its
// screen is drawn (`Model.scroll`): a landing on a history entry (the
// browser's back or forward) at the scroll saved in that entry, a step down
// the stack (an entry page closed onto its list) at the scroll the list was
// left at, any other move at the top. A link that leaves a list keeps its
// scroll for that step down. The landing of the app's own back
// (`backOrPushUrlCmd`) comes to the destination already shown and changes
// nothing: the step drew the list at its place already.
export const navigationMsgHandler = (
  subMsg: NavigationMsg,
  model: Model,
): [Model, Cmd<Msg>] => {
  const prevDestination = destinationOf(model)
  if (
    subMsg._tag === 'UrlChanged' &&
    DestinationEq.equals(prevDestination, subMsg.destination)
  ) {
    return [model, Cmd.none()]
  } else {
    const listScrollY: Model['listScrollY'] =
      subMsg._tag === 'Navigate'
        ? pipe(
            listKindOf(prevDestination.screen),
            O.fold(
              () => model.listScrollY,
              (kind) => ({ ...model.listScrollY, [kind]: subMsg.scrollY }),
            ),
          )
        : model.listScrollY
    // A move closes any tooltip: its trigger goes away with the screen
    const opened: Model = {
      ...openDestination(subMsg.destination, model),
      tooltip: Tooltip.update({ _tag: 'Dismiss' }, model.tooltip)[0],
      // The scroll the move makes shows or hides it
      backToTop: model.backToTop,
      listScrollY,
      scroll: model.scroll,
      windowWidth: model.windowWidth,
    }
    const nextDestination = destinationOf(opened)
    const top =
      subMsg._tag === 'UrlChanged'
        ? subMsg.scrollY
        : isScreenBelow(prevDestination, nextDestination)
          ? pipe(
              listKindOf(nextDestination.screen),
              O.fold(
                () => 0,
                (kind) => listScrollY[kind],
              ),
            )
          : 0
    const updatedModel: Model = {
      ...opened,
      scroll: { seq: model.scroll.seq + 1, top },
    }
    return [updatedModel, setTitleCmd(updatedModel)]
  }
}
