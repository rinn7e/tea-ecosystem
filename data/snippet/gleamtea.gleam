import gleamtea.{type Cmd, type Event, Key, None, Quit}
import gleamtea/color
import gleamtea/key.{Char, Down, Up}
import gleamtea/term
import gleam/int

pub fn main() {
  gleamtea.program(init:, update:, view:)
  |> gleamtea.start
}

fn init() -> #(Int, Cmd(Event(Nil))) {
  #(0, None)
}

fn update(msg: Event(Nil), n: Int) -> #(Int, Cmd(Event(Nil))) {
  case msg {
    Key(Up) -> #(n + 1, None)
    Key(Down) -> #(n - 1, None)
    Key(Char(113)) -> #(n, Quit)
    _ -> #(n, None)
  }
}

fn view(n: Int) -> String {
  color.fg(color.Charmple, term.bold("count: " <> int.to_string(n)))
}
