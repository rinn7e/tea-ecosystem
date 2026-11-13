import { memo } from 'react'

import type * as Listing from '@/component/listing'
import { ListingMemo } from '@/component/listing/component'

// The TEA-adjacent libraries: the same listing as the catalog, over
// `data/adjacent.json`
const AdjacentComponent = ({
  model,
  dispatch,
}: Omit<Listing.Props, 'kind'>) => (
  <ListingMemo kind='adjacent' model={model} dispatch={dispatch} />
)

export const AdjacentMemo = memo(AdjacentComponent)
