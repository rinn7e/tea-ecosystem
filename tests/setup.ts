import { fc } from '@fast-check/vitest'

// A thousand random values per property, not the hundred of fast-check:
// a rare state (every box ticked, one field off the default) then comes
// out on every run, so a bug never lands green and turns a later run red
fc.configureGlobal({ numRuns: 1000 })
