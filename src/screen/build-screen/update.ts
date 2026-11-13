import { Cmd } from 'tea-cup-fp'

import { type BuildLanguage } from '@/common/type/destination'

import { type Model, type Msg } from './type'

export const init = (language: BuildLanguage): Model => ({ language })

export const update = (msg: Msg, _model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'ChangeLanguage':
      return [{ language: msg.language }, Cmd.none()]
  }
}
