type Model = { Count: int }

type Msg =
    | Increment
    | Decrement

let init () = { Count = 0 }

let update msg model =
    match msg with
    | Increment -> { model with Count = model.Count + 1 }
    | Decrement -> { model with Count = model.Count - 1 }

let view model =
    Application(
        ContentPage(
            "Counter",
            VStack(spacing = 16.) {
                Label($"Count is {model.Count}")
                Button("Increment", Increment)
                Button("Decrement", Decrement)
            }
        )
    )
