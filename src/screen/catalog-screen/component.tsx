import { memo } from 'react'

import { ListingMemo } from '@/component/listing/component'

import { type Props, PropsEq } from './type'

// The catalog of TEA frameworks: the shared listing over
// `data/frameworks.json`
const CatalogComponent = ({
  model,
  logosPerRow,
  recentSince,
  dispatch,
}: Props) => (
  <ListingMemo
    model={model.listing}
    logosPerRow={logosPerRow}
    recentSince={recentSince}
    dispatch={(subMsg) => dispatch({ _tag: 'ListingMsg', subMsg })}
  />
)

export const CatalogMemo = memo(CatalogComponent, PropsEq.equals)
