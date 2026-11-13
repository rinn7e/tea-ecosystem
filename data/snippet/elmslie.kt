sealed class Event {
    data class EnterDigit(val digit: Char) : Event()
    data class PerformOperation(val operation: Operation) : Event()
    object Evaluate : Event()
}

sealed class Effect {
    data class NotifyError(val text: String) : Effect()
    data class NotifyNewResult(val result: Int) : Effect()
}

data class State(
    val pendingOperation: Operation? = Operation.PLUS, /* The first value should be added after entering */
    val total: Int = 0,
    val input: Int = 0
)

sealed interface Command

val Reducer = object : StateReducer<Event, State, Effect, Command>() {
    override fun Result.reduce(event: Event) {
        when (event) {
            is Event.EnterDigit -> when {
                state.input.toString().length == MAX_INPUT_LENGTH -> {
                    effects { +Effect.NotifyError("Reached max input length") }
                }

                event.digit.isDigit() -> {
                    state { copy(input = "${state.input}${event.digit}".toInt()) }
                }

                else -> effects { +Effect.NotifyError("${event.digit} is not a digit") }
            }

            is Event.PerformOperation -> {
                val total = state.pendingOperation?.invoke(state.total, state.input) ?: state.total
                state { copy(pendingOperation = event.operation, total = total, input = 0) }
                effects { +Effect.NotifyNewResult(total) }
            }

            is Event.Evaluate -> {
                val total = state.pendingOperation?.invoke(state.total, state.input) ?: state.total
                state { copy(pendingOperation = null, total = total, input = 0) }
                effects { +Effect.NotifyNewResult(total) }
            }
        }
    }
}

fun createStore() = ElmStore(
    initialState = State(),
    reducer = Reducer,
    actor = NoOpActor()
).start()
