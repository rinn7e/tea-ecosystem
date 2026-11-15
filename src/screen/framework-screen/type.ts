import * as EqClass from 'fp-ts/Eq'
import * as S from 'fp-ts/string'

import { type Entries, EntriesEq } from '@/common/data/catalog'
import { type Destination, DestinationEq } from '@/common/type/destination'
import { type Framework } from '@/common/type/framework'

// A framework page, over the catalog in the screen stack. Static: the
// framework comes from the data files, so the page has no messages.
export type Model = {
  framework: Framework
}

export const ModelEq: EqClass.Eq<Model> = EqClass.struct({
  framework: EqClass.contramap((f: Framework) => f.id)(S.Eq),
})

export type Props = {
  model: Model
  // The entries of both lists (`Model.entries`): the other entries in its
  // languages
  entries: Entries
  // The list under this page (the catalog or the adjacent list), as it was
  // left: the target of its back link
  listDestination: Destination
  // The first day that counts as recent (`recentSinceOf`): whether the
  // page shows the ribbon "Recently added"
  recentSince: string
}

export const PropsEq: EqClass.Eq<Props> = EqClass.struct({
  model: ModelEq,
  entries: EntriesEq,
  listDestination: DestinationEq,
  recentSince: S.Eq,
})
