import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

import { type ListId, frameworkById, listOf } from '@/common/data/catalog'
import { type Destination } from '@/common/type/destination'

// A layer of the screen stack: a list at the bottom (the catalog or the
// adjacent list), the page of one of its entries over it, and the screens
// that stand alone (the rubric, the guide, Not Found), which a move
// switches to rather than stacks
type ScreenLayer =
  | { readonly _tag: 'List'; readonly list: ListId }
  | { readonly _tag: 'Framework'; readonly frameworkId: string }
  | { readonly _tag: 'Alone'; readonly screen: Destination['screen']['_tag'] }

const layerEquals = (x: ScreenLayer, y: ScreenLayer): boolean => {
  switch (x._tag) {
    case 'List':
      return y._tag === 'List' && x.list === y.list
    case 'Framework':
      return y._tag === 'Framework' && x.frameworkId === y.frameworkId
    case 'Alone':
      return y._tag === 'Alone' && x.screen === y.screen
  }
}

export const screenStackOf = (destination: Destination): ScreenLayer[] => {
  const { screen } = destination
  switch (screen._tag) {
    case 'CatalogScreen':
      return [{ _tag: 'List', list: 'catalog' }]
    case 'AdjacentScreen':
      return [{ _tag: 'List', list: 'adjacent' }]
    case 'FrameworkScreen':
      // The page of an entry sits on the list it belongs to; an unknown
      // id opens Not Found, which stands alone
      return pipe(
        frameworkById(screen.frameworkId),
        O.fold(
          (): ScreenLayer[] => [{ _tag: 'Alone', screen: 'NotFoundScreen' }],
          (framework): ScreenLayer[] => [
            { _tag: 'List', list: listOf(framework) },
            { _tag: 'Framework', frameworkId: screen.frameworkId },
          ],
        ),
      )
    case 'RubricScreen':
    case 'AboutScreen':
    case 'BuildScreen':
    case 'NotFoundScreen':
      return [{ _tag: 'Alone', screen: screen._tag }]
  }
}

// `next` is a screen below `prev`: its stack is the bottom of the stack of
// `prev`, with at least one layer less (an entry page closed onto its
// list). Read from the two destinations alone, whatever message made the
// step. Another entry is no screen below, nor is a switch to a screen
// that stands alone.
export const isScreenBelow = (
  prev: Destination,
  next: Destination,
): boolean => {
  const prevStack = screenStackOf(prev)
  const nextStack = screenStackOf(next)
  return (
    nextStack.length < prevStack.length &&
    pipe(
      A.zip(nextStack, prevStack),
      A.every(([n, p]) => layerEquals(n, p)),
    )
  )
}
