import { type Destination, toUrlString } from '@/common/type/destination'
import { type Model, type Msg } from '@/type'
import { init, update } from '@/update'

// A model booted on `path`, the way the app boots on a page URL, in a
// desktop window, at a time (ms since 1970) that gives each entry its
// status: by default before any push, as `tests/helper/entries.ts` says
export const bootOn = (path: string, loadTime = 0): Model =>
  init({ href: `http://localhost${path}` }, 1280, loadTime)[0]

export const navigate = (model: Model, destination: Destination): Model =>
  update(
    {
      _tag: 'NavigationMsg',
      subMsg: { _tag: 'Navigate', destination, scrollY: 0, back: false },
    },
    model,
  )[0]

export const step = (model: Model, msg: Msg): Model => update(msg, model)[0]

export const urlOf = toUrlString
