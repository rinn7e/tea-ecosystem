type Msg = Increment | Decrement

let init () = 0, Cmd.none

let update msg model =
    match msg with
    | Increment -> model + 1, Cmd.none
    | Decrement -> model - 1, Cmd.none

let view model = Text.text (sprintf "count: %d" model) Style.text

let mapInput e =
    match e with
    | Key ke ->
        match ke.Key with
        | ArrowUp -> Some Increment
        | ArrowDown -> Some Decrement
        | _ -> None
    | _ -> None

Program.create init update view
|> Program.withMapInput mapInput
|> Runtime.run
