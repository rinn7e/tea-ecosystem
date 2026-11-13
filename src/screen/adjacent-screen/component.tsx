import { memo } from 'react'

import { type ScreenProps, ScreenPropsEq } from '@/component/listing'
import { ListingMemo } from '@/component/listing/component'

// The TEA-adjacent libraries: the same listing as the catalog, over
// `data/adjacent.json`
const AdjacentComponent = ({ model, logosPerRow, dispatch }: ScreenProps) => (
  <ListingMemo
    kind='adjacent'
    model={model}
    logosPerRow={logosPerRow}
    dispatch={dispatch}
  />
)

export const AdjacentMemo = memo(AdjacentComponent, ScreenPropsEq.equals)
