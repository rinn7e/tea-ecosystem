import { EqAlways } from '@rinn7e/tea-cup-prelude'
import * as EqClass from 'fp-ts/Eq'
import * as S from 'fp-ts/string'
import { type Dispatcher } from 'tea-cup-fp'

import { type BuildLanguage } from '@/common/type/destination'

// The guide shows its code in one language at a time, which the URL keeps
// (`/build-your-own?language=kotlin`)
export type Model = {
  language: BuildLanguage
}

export const ModelEq: EqClass.Eq<Model> = EqClass.struct({
  language: S.Eq,
})

export type Msg = { _tag: 'ChangeLanguage'; language: BuildLanguage }

export type Props = {
  model: Model
  dispatch: Dispatcher<Msg>
}

export const PropsEq: EqClass.Eq<Props> = EqClass.struct({
  model: ModelEq,
  dispatch: EqAlways,
})
