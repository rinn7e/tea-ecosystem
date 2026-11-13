import { EqAlways } from '@rinn7e/tea-cup-prelude'
import * as EqClass from 'fp-ts/Eq'
import { type Dispatcher } from 'tea-cup-fp'

// The rubric: what counts as TEA, the four grades and the three tiers.
// Static for now, so its model and its messages are empty: a feature on it
// (a section that opens) starts from this frame
export type Model = Record<string, never>

export const ModelEq: EqClass.Eq<Model> = EqClass.struct({})

export type Msg = { _tag: 'NoOp' }

export type Props = {
  model: Model
  dispatch: Dispatcher<Msg>
}

export const PropsEq: EqClass.Eq<Props> = EqClass.struct({
  model: ModelEq,
  dispatch: EqAlways,
})
