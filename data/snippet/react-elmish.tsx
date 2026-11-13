export type Message = { name: 'increment' } | { name: 'decrement' }

export const Msg = {
  increment: (): Message => ({ name: 'increment' }),
  decrement: (): Message => ({ name: 'decrement' }),
}

export interface Model {
  value: number
}

export interface Props {
  initialValue: number
}

export function init(props: Props): InitResult<Model, Message> {
  return [
    {
      value: props.initialValue,
    },
  ]
}

export const update: UpdateMap<Props, Model, Message> = {
  increment(msg, model, props) {
    return [{ value: model.value + 1 }]
  },

  decrement(msg, model, props) {
    return [{ value: model.value - 1 }]
  },
}

function App(props: Props): JSX.Element {
  const [model, dispatch] = useElmish({ props, init, update, name: 'App' })

  return (
    <div>
      <p>{model.value}</p>

      <button onClick={() => dispatch(Msg.increment())}>Increment</button>
      <button onClick={() => dispatch(Msg.decrement())}>Decrement</button>
    </div>
  )
}
