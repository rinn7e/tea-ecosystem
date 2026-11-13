import { memo } from 'react'

import { defaultDestination } from '@/common/type/destination'
import { Link } from '@/component/link'

const NotFoundComponent = () => (
  <div className='flex flex-col items-center gap-[12px] py-[64px] text-center'>
    <h1 className='text-ink text-[2.625rem] leading-tight font-normal'>
      Nothing here
    </h1>
    <p className='text-ink-muted text-base'>
      This page or framework is not in the catalog.
    </p>
    <Link
      destination={defaultDestination()}
      className='text-accent text-sm hover:underline'
    >
      Back to the catalog
    </Link>
  </div>
)

export const NotFoundMemo = memo(NotFoundComponent)
