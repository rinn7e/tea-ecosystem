data class Model(
    val count: Int = 0
)

sealed interface Msg {
    object Increment : Msg
    object Decrement : Msg
}

val update: (Msg, Model) -> Pair<Model, Effect<Msg>> = { msg, model ->
    when (msg) {
        Msg.Increment -> next(model.copy(count = model.count + 1))
        Msg.Decrement -> next(model.copy(count = model.count - 1))
    }
}

class Props(
    val count: Int,
    val increment: () -> Unit,
    val decrement: () -> Unit,
)

val view: (Model, Dispatch<Msg>) -> Props = { model ->
    Props(
        model.count,
        { dispatch(Msg.Increment) },
        { dispatch(Msg.Decrement) },
    )
}

val init: () -> Pair<Model, Effect<Msg>> = {
    next(Model())
}

val render: (Props) -> Any? = { props, dispatch ->
    // Platform specific rendering
    countLabel.text = "${props.count}"
    incrementButton.setOnClickListener { props.increment() }
    decrementButton.setOnClickListener { props.decrement() }
}

val dispose = Oolong.runtime(
    init,
    update,
    view,
    render,
)
