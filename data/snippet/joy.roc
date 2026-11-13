Model : { count : I64 }

Msg : [Increment, Decrement]

subscriptions = |_model| []

init : Str -> (Model, List(Effect(Msg)))
init = |_| ({ count: 0 }, [])

update : Model, Msg -> (Model, List(Effect(Msg)))
update = |model, msg|
    match msg {
        Increment => ({ count: model.count + 1 }, [])
        Decrement => ({ count: model.count - 1 }, [])
    }

render : Model -> Html(Msg)
render = |model|
    div(
        [],
        [
            button([on_click(Increment)], [text("+")]),
            text(model.count.to_str()),
            button([on_click(Decrement)], [text("-")]),
        ],
    )
