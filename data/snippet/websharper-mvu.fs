type Model =
    {
        EndPoint : EndPoint
        Entries : Map<string, string>
        Input : string
        ServerResponse : option<int>
        Counter : int
    }

[<NamedUnionCases "type">]
type Message =
    | Goto of endpoint: EndPoint
    | SetEntry of key: string * value: string
    | RemoveEntry of key: string
    | SendToServer
    | ServerReplied of response: int
    | AddTwoToCounter

let Update (message: Message) (model: Model) =
    match message with
    | SetEntry (k, v) ->
        SetModel { model with Entries = Map.add k v model.Entries }
    | RemoveEntry k ->
        SetModel {
            model with
                Entries = Map.remove k model.Entries
                EndPoint =
                    match model.EndPoint with
                    | EditEntry k' when k = k' -> Home
                    | ep -> ep
        }
    | Goto ep ->
        SetModel { model with EndPoint = ep }
    | SendToServer ->
        DispatchAsync ServerReplied (Remoting.SendToServer model.Entries)
    | ServerReplied x ->
        SetModel { model with ServerResponse = Some x }
    | AddTwoToCounter ->
        UpdateModel (fun m -> { m with Counter = m.Counter + 1 })
        +
        UpdateModel (fun m -> { m with Counter = m.Counter + 1 })

let counter dispatch (model: View<Model>) =
    p [] [
        text (string model.V.Counter + " ")
        button [on.click (fun _ _ -> dispatch AddTwoToCounter)] [text "Increment by two"]
        text " (this tests that UpdateModel works correctly)"
    ]

let Main () =
    App.CreatePaged InitModel Update Render
    |> App.Run
