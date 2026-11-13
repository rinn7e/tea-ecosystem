import { describe, expect, it, vi } from 'vitest'

import { defaultListingFilter } from '@/common/type/destination'
import * as Listing from '@/component/listing'
import { type Msg, init, update } from '@/screen/catalog-screen'

describe('the update of the catalog', () => {
  it('opens its listing with the filter of its destination', () => {
    const filter = { ...defaultListingFilter(), query: 'rust' }
    expect(init(filter).listing).toEqual(Listing.init(filter))
  })

  it('hands a listing message to its listing', () => {
    const [next] = update(
      { _tag: 'ListingMsg', subMsg: { _tag: 'SetLayout', layout: 'table' } },
      init(defaultListingFilter()),
    )
    expect(next.listing.filter.layout).toBe('table')
  })

  it('hands the commands of its listing back as its own messages', async () => {
    vi.useFakeTimers()
    const [open] = update(
      { _tag: 'ListingMsg', subMsg: { _tag: 'TogglePanel' } },
      init(defaultListingFilter()),
    )
    const [closing, closeCmd] = update(
      { _tag: 'ListingMsg', subMsg: { _tag: 'PanelKeyDown', key: 'Escape' } },
      open,
    )
    const dispatched: Msg[] = []
    closeCmd.execute((msg) => dispatched.push(msg))
    await vi.advanceTimersByTimeAsync(Listing.PANEL_LEAVE_DURATION)
    vi.useRealTimers()
    expect(dispatched).toEqual([
      {
        _tag: 'ListingMsg',
        subMsg: { _tag: 'PanelClosed', seq: closing.listing.panelSeq },
      },
    ])
  })
})
