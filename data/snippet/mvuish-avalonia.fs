module Counter

type Model = { Count: int }
type Msg = Increment

let init () = { Count = 0 }, Cmd.none

let update msg model =
    match msg with
    | Increment ->
      { model with Count = model.Count + 1 }, Cmd.none

let view (model: IObservable<Model>) dispatch =
    let countText = model |> Observable.map(fun m -> sprintf "Count: %d" m.Count)

    StackPanel().Children(
        TextBlock().Text(countText),
        Button().Content("Increment").OnClick(fun _ obs ->
            obs |> Observable.add(fun _ -> dispatch Increment)
        )
    )
