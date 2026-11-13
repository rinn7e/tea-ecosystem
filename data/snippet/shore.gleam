type Model {
  Model(counter: Int)
}

fn init() -> #(Model, List(fn() -> Msg)) {
  let model = Model(counter: 0)
  let cmds = []
  #(model, cmds)
}

type Msg {
  Increment
  Decrement
}

fn update(model: Model, msg: Msg) -> #(Model, List(fn() -> Msg)) {
  case msg {
    Increment -> #(Model(counter: model.counter + 1), [])
    Decrement -> #(Model(counter: model.counter - 1), [])
  }
}

fn view(model: Model) -> shore.Node(Msg) {
  ui.box(
    [
      ui.text(
        "keybinds

i: increments
d: decrements
ctrl+x: exits
      ",
      ),
      ui.text(int.to_string(model.counter)),
      ui.br(),
      ui.row([
        ui.button("increment", key.Char("i"), Increment),
        ui.button("decrement", key.Char("d"), Decrement),
      ]),
    ],
    Some("counter"),
  )
  |> ui.align(style.Center, _)
  |> layout.center(style.Px(50), style.Px(12))
}
