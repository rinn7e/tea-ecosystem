import { memo } from 'react'

import { type ScreenProps, ScreenPropsEq } from '@/component/listing'
import { ListingMemo } from '@/component/listing/component'

// The catalog of TEA frameworks: the shared listing over
// `data/frameworks.json`
const CatalogComponent = ({ model, logosPerRow, dispatch }: ScreenProps) => (
  <ListingMemo
    kind='catalog'
    model={model}
    logosPerRow={logosPerRow}
    dispatch={dispatch}
  />
)

export const CatalogMemo = memo(CatalogComponent, ScreenPropsEq.equals)
