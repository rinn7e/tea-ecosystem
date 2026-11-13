import { type Destination, toUrlString } from '@/common/type/destination'
import { type Model, type Msg } from '@/type'
import { init, update } from '@/update'

// A model booted on `path`, the way the app boots on a page URL
export const bootOn = (path: string): Model =>
  init({ href: `http://localhost${path}` })[0]

export const navigate = (model: Model, destination: Destination): Model =>
  update(
    {
      _tag: 'NavigationMsg',
      subMsg: { _tag: 'Navigate', destination, scrollY: 0 },
    },
    model,
  )[0]

export const step = (model: Model, msg: Msg): Model => update(msg, model)[0]

export const urlOf = toUrlString
