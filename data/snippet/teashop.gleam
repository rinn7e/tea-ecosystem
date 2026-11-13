pub type Status {
  Selected
  Unselected
}

pub type Model {
  Model(choices: List(#(String, Status)), cursor: Int)
}

const initial_model = Model(
  cursor: 0,
  choices: [
    #("Kitten cuddles 🐈", Unselected),
    #("Strawberry shortcake 🍰", Unselected),
    #("Blueberry muffins 🫐", Unselected),
  ],
)

pub fn init(_) {
  #(initial_model, command.set_window_title("teashop"))
}

pub fn update(model: Model, event) {
  case event {
    event.Key(key.Char("q")) | event.Key(key.Esc) -> #(model, command.quit())

    event.Key(key.Char("k")) | event.Key(key.Up) -> {
      let choices_len = list.length(model.choices)
      let cursor = case model.cursor == 0 {
        True -> choices_len - 1
        False -> model.cursor - 1
      }
      #(Model(..model, cursor: cursor), command.noop())
    }

    _otherwise -> #(model, command.noop())
  }
}

pub fn view(model: Model) {
  let options =
    model.choices
    |> list.index_map(fn(element, index) {
      let #(name, status) = element
      let cursor = case model.cursor == index {
        True -> ">"
        False -> " "
      }
      let checked = case status {
        Selected -> "x"
        _ -> " "
      }
      cursor <> " [" <> checked <> "] " <> name
    })
    |> string.join("\n")

  let header = "What should we get at the tea shop?"
  let footer = "Press q to quit."

  [header, options, footer]
  |> string.join("\n\n")
}

pub fn main() {
  let app = teashop.app(init, update, view)
  teashop.start(app, Nil)
}
