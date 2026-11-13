import { cmdSucceed } from '@rinn7e/tea-cup-prelude'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { Cmd } from 'tea-cup-fp'

import { frameworkById } from '@/common/data/catalog'
import {
  type Destination,
  DestinationEq,
  type NavigationMsg,
} from '@/common/type/destination'
import { restoreScrollCmd, scrollToTopCmd } from '@/common/util'
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
// every screen (the tooltip, the button back to the top) stay as they are.
// Review: called only by `navigationMsgHandler` and the boot.
export const openDestination = (
  destination: Destination,
  lists: Lists,
): Omit<Model, 'tooltip' | 'backToTop'> => {
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

// Every move of the app. The URL follows the destination after the step
// (`withUrl`), so nothing here writes it. A landing on a history entry
// (`UrlChanged`: the browser's back or forward, or the app's own back)
// restores the scroll saved in that entry; to the destination already
// shown it changes nothing else (the landing of `backOrPushUrlCmd`). A move
// forward in the app starts at the top of the page; a step down the stack
// waits for its landing, which restores the scroll.
export const navigationMsgHandler = (
  subMsg: NavigationMsg,
  model: Model,
): [Model, Cmd<Msg>] => {
  const prevDestination = destinationOf(model)
  const isLanding = subMsg._tag === 'UrlChanged'
  const restoreCmd = restoreScrollCmd().map((noOp): Msg => noOp)
  if (isLanding && DestinationEq.equals(prevDestination, subMsg.destination)) {
    return [model, restoreCmd]
  } else {
    // A move closes any tooltip: its trigger goes away with the screen
    const updatedModel: Model = {
      ...openDestination(subMsg.destination, model),
      tooltip: Tooltip.update({ _tag: 'Dismiss' }, model.tooltip)[0],
      // The scroll the move makes shows or hides it
      backToTop: model.backToTop,
    }
    const isForward =
      !isLanding && !isScreenBelow(prevDestination, destinationOf(updatedModel))
    return [
      updatedModel,
      Cmd.batch([
        setTitleCmd(updatedModel),
        isLanding
          ? restoreCmd
          : isForward
            ? scrollToTopCmd().map((noOp): Msg => noOp)
            : Cmd.none(),
      ]),
    ]
  }
}
