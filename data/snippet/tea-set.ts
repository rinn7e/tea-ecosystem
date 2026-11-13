type Model = { count: number; ticking: boolean }
type Msg = { kind: 'Incremented' } | { kind: 'TickingToggled' } | { kind: 'Ticked' }

const everyMs = <Msg>(ms: number, toMsg: () => Msg): Sub<Msg> =>
  Sub.fromSource('time/every', { ms }, ({ ms }, dispatch) => {
    const id = setInterval(() => dispatch(toMsg()), ms)
    return () => clearInterval(id)
  })

const program: Program<void, Model, Msg> = {
  init: () => [{ count: 0, ticking: false }, Cmd.none],

  update: (msg, model) => {
    switch (msg.kind) {
      case 'Incremented':
      case 'Ticked':
        return [{ ...model, count: model.count + 1 }, Cmd.none]
      case 'TickingToggled':
        return [{ ...model, ticking: !model.ticking }, Cmd.none]
      default:
        return assertNever(msg) // add a variant to Msg and this stops compiling
    }
  },

  subscriptions: (model) => (model.ticking ? everyMs(1000, () => ({ kind: 'Ticked' })) : Sub.none),

  view: (model, dispatch) => {
    document.body.textContent = `count: ${model.count}`
    document.body.onclick = () => dispatch({ kind: 'Incremented' })
  },
}
