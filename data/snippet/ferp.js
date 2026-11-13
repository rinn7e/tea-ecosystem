const ferp = require('ferp')

const initialState = 0

const incrementAction = (state) => [
  state + 1,
  ferp.effects.act(incrementAction),
]

ferp.app({
  init: [initialState, ferp.effects.act(incrementAction)],
})
