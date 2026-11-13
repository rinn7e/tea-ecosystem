import { createAction } from '@ngrx/store'
import { createReducer, on } from '@ngrx/store'

export const increment = createAction('[Counter Component] Increment')
export const decrement = createAction('[Counter Component] Decrement')
export const reset = createAction('[Counter Component] Reset')

export const initialState = 0

export const counterReducer = createReducer(
  initialState,
  on(increment, (state) => state + 1),
  on(decrement, (state) => state - 1),
  on(reset, () => 0),
)
