import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { type ProgramListener } from 'react-tea-cup'

import {
  type Destination,
  DestinationEq,
  type ListingFilter,
  ListingFilterEq,
  parseDestination,
  toUrlString,
} from '@/common/type/destination'
import {
  backOrPushUrl,
  pushUrl,
  replaceUrl,
  savedScrollOfEntry,
} from '@/common/util'
import { type Model, type Msg } from '@/type'

import { destinationOf } from './destination'
import { isScreenBelow } from './screen-stack'

// The URL is an adapter at the edges: written from the destination
// (`destinationOf`, read from the models) after every step, by the one URL
// writer of the program (`urlWriterOf`), and read only at boot and on the
// browser's back and forward (`UrlChanged`).
// `toUrlString` / `parseDestination` are the only code that knows its
// spelling.
export type UrlWrite =
  | { readonly _tag: 'PushUrl'; readonly url: string }
  | { readonly _tag: 'ReplaceUrl'; readonly url: string }
  | { readonly _tag: 'BackOrPushUrl'; readonly url: string }

const listFilterOf = (destination: Destination): O.Option<ListingFilter> => {
  const { screen } = destination
  switch (screen._tag) {
    case 'CatalogScreen':
    case 'AdjacentScreen':
      return O.some(screen.filter)
    case 'FrameworkScreen':
    case 'RubricScreen':
    case 'AboutScreen':
    case 'PrivacyScreen':
    case 'BuildScreen':
    case 'NotFoundScreen':
      return O.none
  }
}

// Only the search text, or only the order, of a list changed: typing, or
// stepping through the sort menu with the arrow keys (each step is a
// change), refines the same place, so it replaces the entry instead of
// pushing one per key
const isRefinement = (prev: Destination, next: Destination): boolean =>
  prev.screen._tag === next.screen._tag &&
  pipe(
    O.Do,
    O.apS('before', listFilterOf(prev)),
    O.apS('after', listFilterOf(next)),
    O.exists(
      ({ before, after }) =>
        ListingFilterEq.equals(
          { ...before, query: '' },
          { ...after, query: '' },
        ) ||
        ListingFilterEq.equals(
          { ...before, sort: O.none },
          { ...after, sort: O.none },
        ),
    ),
  )

// How the browser's history follows a step:
//
// 1. A back or forward of the browser (`UrlChanged`) already has its
//    entry: it writes nothing, unless the app shows another destination
//    than the one its URL opens (then it replaces).
// 2. The same destination writes nothing.
// 3. Typing in the search of a list, or changing only its order, replaces
//    (`isRefinement`).
// 4. A step onto a screen below the one shown (`isScreenBelow`: a framework
//    page closed onto the catalog, whatever message made it) goes back in
//    the browser's history when the entry under the current one holds the
//    URL it returns to, so the in-app back and the browser's back are the
//    same step (`backOrPushUrl`).
// 5. Any other change of destination pushes an entry.
export const urlWriteOf = (
  msg: Msg,
  prevModel: Model,
  model: Model,
): O.Option<UrlWrite> => {
  const prev = destinationOf(prevModel)
  const next = destinationOf(model)
  const url = toUrlString(next)
  if (msg._tag === 'NavigationMsg' && msg.subMsg._tag === 'UrlChanged') {
    return DestinationEq.equals(next, msg.subMsg.destination)
      ? O.none
      : O.some({ _tag: 'ReplaceUrl', url })
  } else if (url === toUrlString(prev)) {
    return O.none
  } else if (isRefinement(prev, next)) {
    return O.some({ _tag: 'ReplaceUrl', url })
  } else if (isScreenBelow(prev, next)) {
    return O.some({ _tag: 'BackOrPushUrl', url })
  } else {
    return O.some({ _tag: 'PushUrl', url })
  }
}

export const bootDestinationOf = (
  location: Pick<Location, 'href'>,
): Destination => parseDestination(location.href)

// The browser's back or forward landed on `location`: opened as a move,
// with the scroll saved in the entry it landed on (already the state of
// the history when `popstate` fires)
export const urlChangedMsg = (location: Pick<Location, 'href'>): Msg => ({
  _tag: 'NavigationMsg',
  subMsg: {
    _tag: 'UrlChanged',
    destination: parseDestination(location.href),
    scrollY: savedScrollOfEntry(),
  },
})

const writeUrl = (write: UrlWrite): void => {
  switch (write._tag) {
    case 'PushUrl':
      return pushUrl(write.url)
    case 'ReplaceUrl':
      return replaceUrl(write.url)
    case 'BackOrPushUrl':
      return backOrPushUrl(write.url)
  }
}

// Keeps the URL in sync with the destination (see `urlWriteOf`): the
// listener of the program (`src/program.tsx`), which it calls with the
// model of `init` and then after every step, right after `update` and
// before React draws the step. So a write that leaves an entry runs while
// the page left is still drawn, and saves its scroll in that entry
// (`pushUrl`). It holds the model of the step before, to compare the
// destinations. Not a wrapper around `update`, and no `Cmd`: a command
// runs after React has drawn the step. See "No update wrapper" in the code
// convention.
export const urlWriterOf = (): ProgramListener<Model, Msg> => {
  let prevModel: O.Option<Model> = O.none
  return (event) => {
    const [model] = event.mac
    if (event.tag === 'update') {
      pipe(
        prevModel,
        O.chain((prev) => urlWriteOf(event.msg, prev, model)),
        O.map(writeUrl),
      )
    }
    prevModel = O.some(model)
  }
}
