import * as O from 'fp-ts/Option'

import { type ListKind, listOf } from '@/common/data/catalog'
import {
  type Destination,
  adjacentScreen,
  catalogScreen,
  destinationOfScreen,
} from '@/common/type/destination'
import { type Model, currentScreenOf } from '@/type'

// Where the app is, read from the models that show it, never stored. The
// URL is written from it (`urlWriteOf`) and read only at boot and on the
// browser's back and forward.
export const destinationOf = (model: Model): Destination => ({
  screen: currentScreenOf(model),
})

// The catalog as it was left under the screen shown: the target of every
// link back to it, so going back keeps its filters
export const catalogDestinationOf = (model: Model): Destination =>
  destinationOfScreen(catalogScreen(model.catalog.filter))

// The adjacent list as it was left, the same way
export const adjacentDestinationOf = (model: Model): Destination =>
  destinationOfScreen(adjacentScreen(model.adjacent.filter))

// The list of `kind` as it was left: where an entry page goes back to
export const listDestinationOf = (model: Model, kind: ListKind): Destination =>
  kind === 'catalog'
    ? catalogDestinationOf(model)
    : adjacentDestinationOf(model)

// Where the floating back button of the screen shown goes, with its label:
// a screen with a parent in the stack (`screenStackOf`) goes back to it.
// Only the page of an entry has one, its list as it was left; the other
// screens stand alone.
export const backOf = (
  model: Model,
): O.Option<{ destination: Destination; label: string }> =>
  model.screenModel._tag === 'FrameworkScreenModel'
    ? O.some({
        destination: listDestinationOf(
          model,
          listOf(model.screenModel.model.framework),
        ),
        label:
          listOf(model.screenModel.model.framework) === 'catalog'
            ? 'Back to all frameworks'
            : 'Back to all TEA-adjacent',
      })
    : O.none
