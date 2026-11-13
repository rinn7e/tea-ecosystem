open SageTUI

type Msg =
  | Increment
  | Decrement
  | Quit

let init () = 0, Cmd.none

let update msg count =
  match msg with
  | Increment -> count + 1, Cmd.none
  | Decrement -> max 0 (count - 1), Cmd.none
  | Quit -> count, Cmd.quit

let view count =
  El.column [
    El.text "Hello, SageTUI!"
      |> El.bold
      |> El.fg (Color.Rgb(255uy, 200uy, 50uy))
    El.text ""
    El.text (sprintf "Count: %d" count) |> El.bold
    El.text ""
    El.text "[j] increment  [k] decrement  [q] quit" |> El.dim
  ]
  |> El.padAll 1
  |> El.bordered Rounded

let keyBindings =
  Keys.bind [
    Key.Char 'j', Increment
    Key.Char 'k', Decrement
    Key.Char 'q', Quit
    Key.Escape, Quit
  ]

let program : Program<int, Msg> =
  { Init = init
    Update = update
    View = view
    Subscribe = fun _ -> [ keyBindings ] }

[<EntryPoint>]
let main _ = App.run program; 0
