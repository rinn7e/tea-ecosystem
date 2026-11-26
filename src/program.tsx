import { cmdSucceedWithMsg, devTools } from '@rinn7e/tea-cup-prelude'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { type ProgramInterop, ProgramWithNav } from 'react-tea-cup'
import { Cmd, type Dispatcher } from 'tea-cup-fp'

import { bootOf } from '@/common/util/boot'
import { windowWidthOf } from '@/common/util/window-width'

import { App } from './app'
import { subscriptions } from './subscription'
import { type Model, type Msg } from './type'
import { init, update } from './update'
import { urlChangedMsg, urlWriterOf } from './util'

const appView = (dispatch: Dispatcher<Msg>, model: Model) => (
  <App model={model} dispatch={dispatch} />
)

// The URL follows the destination of every step, written by the listener
// of the program before React draws the step (`urlWriterOf`). One for the
// app, so it keeps the model of the step before across renders.
const urlWriter = urlWriterOf()

// The log of every message, on the dev server only. Its listener runs
// after the URL writer, which the program takes as its one listener.
const devProgramProps: ProgramInterop<Model, Msg> = import.meta.env.DEV
  ? devTools<Model, Msg>().getProgramProps()
  : {}

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
        const [model, cmd] = init(
          location,
          boot.windowWidth,
          boot.now,
          O.fromNullable(boot.repoStars),
        )
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
    update={update}
    view={appView}
    subscriptions={subscriptions}
    {...devProgramProps}
    listener={(event) => {
      urlWriter(event)
      devProgramProps.listener?.(event)
    }}
  />
)
