import React from 'react'
import { Program } from 'react-tea-cup'
import { Cmd, Dispatcher, Sub } from 'tea-cup-fp'

type Model = number

type Msg = { type: 'INCREMENT' } | { type: 'DECREMENT' }

function init(): [Model, Cmd<Msg>] {
  return [
    0, // initial model
    Cmd.none(), // no initial commands
  ]
}

function view(dispatch: Dispatcher<Msg>, model: Model) {
  return (
    <div>
      <button onClick={() => dispatch({ type: 'DECREMENT' })}>-</button>
      <span>value = {model}</span>
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>+</button>
    </div>
  )
}

function update(msg: Msg, model: Model): [Model, Cmd<Msg>] {
  switch (msg.type) {
    case 'INCREMENT':
      return [model + 1, Cmd.none()]
    case 'DECREMENT':
      return [model - 1, Cmd.none()]
  }
}

function subscriptions(model: Model): Sub<Msg> {
  return Sub.none() // no subs in this example
}

const App = () => (
  <Program
    init={init}
    view={view}
    update={update}
    subscriptions={subscriptions}
  />
)

export default App
