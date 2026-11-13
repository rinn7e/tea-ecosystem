import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { Cmd } from 'tea-cup-fp'

import {
  type Destination,
  DestinationEq,
  type ListingFilter,
  ListingFilterEq,
  parseDestination,
  toUrlString,
} from '@/common/type/destination'
import { backOrPushUrlCmd, pushUrlCmd, replaceUrlCmd } from '@/common/util'
import { type Model, type Msg } from '@/type'

import { destinationOf } from './destination'
import { isScreenBelow } from './screen-stack'

// The URL is an adapter at the edges: written from the destination
// (`destinationOf`, read from the models) after every step, read only at
// boot and on the browser's back and forward (`UrlChanged`).
// `toUrlString` / `parseDestination` are the only code that knows its
// spelling.
export type UrlWrite =
  | { readonly _tag: 'PushUrl'; readonly url: string }
  | { readonly _tag: 'ReplaceUrl'; readonly url: string }
  | { readonly _tag: 'BackOrPushUrl'; readonly url: string }

// The filter of a list destination (the catalog, the adjacent list)
const listFilterOf = (destination: Destination): O.Option<ListingFilter> => {
  const { screen } = destination
  switch (screen._tag) {
    case 'CatalogScreen':
    case 'AdjacentScreen':
      return O.some(screen.filter)
    case 'FrameworkScreen':
    case 'RubricScreen':
    case 'AboutScreen':
    case 'BuildScreen':
    case 'NotFoundScreen':
      return O.none
  }
}

// Only the search text of a list changed: typing refines the same place,
// so it replaces the entry instead of pushing one per key
const isQueryEdit = (prev: Destination, next: Destination): boolean =>
  prev.screen._tag === next.screen._tag &&
  pipe(
    O.Do,
    O.apS('before', listFilterOf(prev)),
    O.apS('after', listFilterOf(next)),
    O.exists(
      ({ before, after }) =>
        before.query !== after.query &&
        ListingFilterEq.equals(
          { ...before, query: '' },
          { ...after, query: '' },
        ),
    ),
  )

// How the browser's history follows a step:
//
// 1. A back or forward of the browser (`UrlChanged`) already has its
//    entry: it writes nothing, unless the app shows another destination
//    than the one its URL opens (then it replaces).
// 2. The same destination writes nothing.
// 3. Typing in the catalog search replaces (`isQueryEdit`).
// 4. A step onto a screen below the one shown (`isScreenBelow`: a framework
//    page closed onto the catalog, whatever message made it) goes back in
//    the browser's history when the entry under the current one holds the
//    URL it returns to, so the in-app back and the browser's back are the
//    same step (`backOrPushUrlCmd`).
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
  } else if (isQueryEdit(prev, next)) {
    return O.some({ _tag: 'ReplaceUrl', url })
  } else if (isScreenBelow(prev, next)) {
    return O.some({ _tag: 'BackOrPushUrl', url })
  } else {
    return O.some({ _tag: 'PushUrl', url })
  }
}

// The destination the app boots on: the page's URL
export const bootDestinationOf = (
  location: Pick<Location, 'href'>,
): Destination => parseDestination(location.href)

// The browser's back or forward landed on `location`: opened as a move
export const urlChangedMsg = (location: Pick<Location, 'href'>): Msg => ({
  _tag: 'NavigationMsg',
  subMsg: {
    _tag: 'UrlChanged',
    destination: parseDestination(location.href),
  },
})

const urlWriteCmd = (write: UrlWrite): Cmd<{ _tag: 'NoOp' }> => {
  switch (write._tag) {
    case 'PushUrl':
      return pushUrlCmd(write.url)
    case 'ReplaceUrl':
      return replaceUrlCmd(write.url)
    case 'BackOrPushUrl':
      return backOrPushUrlCmd(write.url)
  }
}

// Keeps the URL in sync with the destination (see `urlWriteOf`). The one
// wrapper around the root `update` (`program.tsx`): see "No update wrapper"
// in the code convention.
export const withUrl = (
  msg: Msg,
  prevModel: Model,
  [model, cmd]: [Model, Cmd<Msg>],
): [Model, Cmd<Msg>] =>
  pipe(
    urlWriteOf(msg, prevModel, model),
    O.fold(
      (): [Model, Cmd<Msg>] => [model, cmd],
      (write): [Model, Cmd<Msg>] => [
        model,
        Cmd.batch([urlWriteCmd(write).map((noOp): Msg => noOp), cmd]),
      ],
    ),
  )
