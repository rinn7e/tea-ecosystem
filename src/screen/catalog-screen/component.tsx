import { memo } from 'react'

import type * as Listing from '@/component/listing'
import { ListingMemo } from '@/component/listing/component'

// The catalog of TEA frameworks: the shared listing over
// `data/frameworks.json`
const CatalogComponent = ({
  model,
  windowWidth,
  dispatch,
}: Omit<Listing.Props, 'kind'>) => (
  <ListingMemo
    kind='catalog'
    model={model}
    windowWidth={windowWidth}
    dispatch={dispatch}
  />
)

export const CatalogMemo = memo(CatalogComponent)
