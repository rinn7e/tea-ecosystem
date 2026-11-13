import { cmdSucceed } from '@rinn7e/tea-cup-prelude'
import { type Cmd } from 'tea-cup-fp'

export * from './browser-history'

export const scrollToTopCmd = (): Cmd<{ _tag: 'NoOp' }> =>
  cmdSucceed(() => {
    window.scrollTo({ top: 0 })
  })
export * from './date'
export * from './number'
