import { devTools } from '@rinn7e/tea-cup-prelude'
import { ProgramWithNav } from 'react-tea-cup'
import { type Cmd, type Dispatcher } from 'tea-cup-fp'

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

export const AppProgram = () => (
  <ProgramWithNav<Model, Msg>
    // The browser's back and forward (the app's own URL writes fire no
    // `popstate`)
    onUrlChange={urlChangedMsg}
    init={(location) => init(location, windowWidthOf())}
    update={appUpdate}
    view={appView}
    subscriptions={subscriptions}
    {...devTools<Model, Msg>().getProgramProps()}
  />
)
