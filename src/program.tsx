import { cmdSucceedWithMsg, devTools } from '@rinn7e/tea-cup-prelude'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { ProgramWithNav } from 'react-tea-cup'
import { Cmd, type Dispatcher } from 'tea-cup-fp'

import { bootOf } from '@/common/util/boot'
import { windowWidthOf } from '@/common/util/window-width'

import { App } from './app'
import { subscriptions } from './subscription'
import { type Model, type Msg } from './type'
import { init, update } from './update'
import { urlChangedMsg, withUrl } from './util'

const appView = (dispatch: Dispatcher<Msg>, model: Model) => (
  <App model={model} dispatch={dispatch} />
)

// Every step goes through `withUrl`, the one wrapper around `update`: the
// URL follows the destination the step leaves
const appUpdate = (msg: Msg, model: Model): [Model, Cmd<Msg>] =>
  withUrl(msg, model, update(msg, model))

// The real time and width of the window, after a first render drawn with
// those of a page rendered ahead of time
const liveValuesCmd: Cmd<Msg> = Cmd.batch([
  cmdSucceedWithMsg(Date.now, (value): Msg => ({ _tag: 'SetNow', value })),
  cmdSucceedWithMsg(windowWidthOf, (value): Msg => ({
    _tag: 'SetWindowWidth',
    value,
  })),
])

// A page rendered ahead of time boots with the time and width it was
// rendered with, so the first render matches its HTML (`bootOf`)
const bootInit = (location: Location): [Model, Cmd<Msg>] =>
  pipe(
    bootOf(document),
    O.fold(
      () => init(location, windowWidthOf(), Date.now()),
      (boot) => {
        const [model, cmd] = init(location, boot.windowWidth, boot.now)
        return [model, Cmd.batch([cmd, liveValuesCmd])]
      },
    ),
  )

export const AppProgram = () => (
  <ProgramWithNav<Model, Msg>
    // The browser's back and forward (the app's own URL writes fire no
    // `popstate`)
    onUrlChange={urlChangedMsg}
    init={bootInit}
    // The first render draws the model of `init`, so React can hydrate
    // the HTML of a prerendered page (`src/root.tsx`)
    initOnFirstRender
    update={appUpdate}
    view={appView}
    subscriptions={subscriptions}
    {...devTools<Model, Msg>().getProgramProps()}
  />
)
