type Model = {
    Counter:int
    IsSpinning: bool
}

type Msg =
    | Increment
    | Decrement
    | Reset
    | StartSpin
    | StopSpin
    | Spinned

let init () : Model * Cmd<Msg> =
    let model = {
        Counter = 0
        IsSpinning = false
    }
    model, Cmd.none


module Commands =
    let startSpinning isSpinning =
        fun dispatch ->
            async {
                do! Async.Sleep 20
                if isSpinning then
                    dispatch Increment
                    dispatch Spinned
            }
            |> Async.StartImmediate
        |> Cmd.ofSub

let update (msg:Msg) (model:Model) =
    match msg with
    | Increment ->
        {model with Counter = model.Counter + 1}, Cmd.none
    | Decrement ->
        {model with Counter = model.Counter - 1}, Cmd.none
    | Reset ->
        {model with Counter = 0}, Cmd.none
    | StartSpin ->
        {model with IsSpinning = true}, Commands.startSpinning true
    | StopSpin ->
        {model with IsSpinning = false}, Cmd.none
    | Spinned ->
        model, Commands.startSpinning model.IsSpinning
let view (model:Model) (dispatch:Msg->unit) =
    [
        View.label [
            prop.position.x.center
            prop.position.y.at 1
            prop.textAlignment.centered
            prop.color (Color.BrightYellow, Color.Green)
            label.text "'F#ncy' Counter!"
        ]

        View.button [
            prop.position.x.center
            prop.position.y.at 5
            button.text "Up"
            button.onClick (fun () -> dispatch Increment)
        ]
    ]
