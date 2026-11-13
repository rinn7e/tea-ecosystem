import { Effect } from '@ts-elmish/basic-effects'
import { ElmishAttrs, createElmishRootComponent } from '@ts-elmish/mithril'
import m, { Component } from 'mithril'

type State = {
  readonly count: number
}

type Action = 'increment' | 'decrement'

const init = (): State => {
  return { count: 0 }
}

const update = ({ count }: State, action: Action): State => {
  switch (action) {
    case 'increment':
      return { count: count + 1 }

    case 'decrement':
      return { count: count - 1 }
  }
}

const Counter: Component<ElmishAttrs<State, Action>> = {
  view: ({ attrs: { count, dispatch } }) =>
    m('div', [
      m('div', count),
      m('button', { onclick: () => dispatch('increment') }, '+'),
      m('button', { onclick: () => dispatch('decrement') }, '-'),
    ]),
}

const App = createElmishRootComponent({
  init: () => [init(), Effect.none<Action>()],
  update: (state, action) => [update(state, action), Effect.none()],
  view: Counter,
})

m.mount(document.body, {
  view: () => m(App, {}),
})
