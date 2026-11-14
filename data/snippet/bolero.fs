type Model = { value: int }
let initModel = { value = 0 }

type Message = Increment | Decrement
let update message model =
    match message with
    | Increment -> { model with value = model.value + 1 }
    | Decrement -> { model with value = model.value - 1 }

let view model dispatch =
    div {
        button { on.click (fun _ -> dispatch Decrement); "-" }
        string model.value
        button { on.click (fun _ -> dispatch Increment); "+" }
    }

let program =
    Program.mkSimple (fun _ -> initModel) update view
