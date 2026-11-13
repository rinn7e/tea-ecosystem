// Counter.tsx
import * as Cmd from 'tea-effect/Cmd'
import * as TeaReact from 'tea-effect/React'

export type Model = { count: number }

export type Msg = { type: 'Increment' } | { type: 'Decrement' }

export const init: [Model, Cmd.Cmd<Msg>] = [{ count: 0 }, Cmd.none]

export const update = (msg: Msg, model: Model): [Model, Cmd.Cmd<Msg>] => {
  switch (msg.type) {
    case 'Increment':
      return [{ count: model.count + 1 }, Cmd.none]
    case 'Decrement':
      return [{ count: model.count - 1 }, Cmd.none]
  }
}

export const view =
  (model: Model): TeaReact.Html<Msg> =>
  (dispatch) => (
    <div>
      <button onClick={() => dispatch({ type: 'Decrement' })}>-</button>
      <span>{model.count}</span>
      <button onClick={() => dispatch({ type: 'Increment' })}>+</button>
    </div>
  )
