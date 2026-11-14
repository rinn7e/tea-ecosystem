[<ModelType>]
type Model = { value : float }

type Action =
| Increment
| Decrement

let update (m : Model) (a : Action) =
    match a with
    | Increment -> { m with value = m.value + 0.1 }
    | Decrement -> { m with value = m.value - 0.1 }

let view (m : AdaptiveModel) =
    require Html.semui (
        body [] (
            [
                div [] [
                        button [clazz "ui button"; onClick (fun _ -> Increment)] [text "+"]
                        button [clazz "ui button"; onClick (fun _ -> Decrement)] [text "-"]
                        br []
                        text "my value:"
                        br []
                        Incremental.text (m.value |> AVal.map(fun x -> sprintf "%.1f" x))
                    ]
            ]
        )
    )

let app =
    {
        unpersist = Unpersist.instance
        threads   = fun _ -> ThreadPool.empty
        initial   = { value = 0.0 }
        update    = update
        view      = view
    }

let start() = App.start app
