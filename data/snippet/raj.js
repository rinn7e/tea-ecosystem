import { runtime } from 'raj'

runtime({
  init: [0], // State is an integer to count
  update(message, state) {
    return [state + 1] // Increment the state
  },
  view(state, dispatch) {
    const keepCounting = window.confirm(`Count is ${state}. Increment?`)
    if (keepCounting) {
      dispatch()
    }
  },
})
