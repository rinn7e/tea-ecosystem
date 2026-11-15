import { memo } from 'react'

import { ListingMemo } from '@/component/listing/component'

import { type Props, PropsEq } from './type'

const CatalogComponent = ({
  model,
  entries,
  logosPerRow,
  recentSince,
  dispatch,
}: Props) => (
  <ListingMemo
    model={model.listing}
    entries={entries}
    logosPerRow={logosPerRow}
    recentSince={recentSince}
    dispatch={(subMsg) => dispatch({ _tag: 'ListingMsg', subMsg })}
  />
)

export const CatalogMemo = memo(CatalogComponent, PropsEq.equals)
