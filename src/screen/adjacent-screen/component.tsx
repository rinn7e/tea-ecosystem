import { memo } from 'react'

import { ListingMemo } from '@/component/listing/component'

import { type Props, PropsEq } from './type'

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
