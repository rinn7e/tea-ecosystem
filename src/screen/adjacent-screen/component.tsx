import { memo } from 'react'

import { ListingMemo } from '@/component/listing/component'

import { type Props, PropsEq } from './type'

// The TEA-adjacent libraries: the same listing as the catalog, over
// `data/adjacent.json`
const AdjacentComponent = ({
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

export const AdjacentMemo = memo(AdjacentComponent, PropsEq.equals)
