data class State(
    val syncCount: Int,
    val asyncCount: Int,
    val isAsyncRunning: Boolean,
)

sealed interface Msg

sealed class ExternalMsg : Msg {

    data object IncrementSync : ExternalMsg()

    data object IncrementAsync : ExternalMsg()
}

sealed class InternalMsg : Msg {

    data class CompletedAsyncOperation(val value: Int) : InternalMsg()
}

sealed class Effect {

    data class Increment(val value: Int) : CounterEffect()
}

val externalUpdate = Update<State, ExternalMsg, Effect> { msg, state ->
    when (msg) {
        ExternalMsg.IncrementSync ->
            state.copy(syncCount = state.syncCount.inc()) to emptySet()

        ExternalMsg.IncrementAsync ->
            if (state.isAsyncRunning) {
                state to emptySet()
            } else {
                state.copy(isAsyncRunning = true) to setOf(Effect.Increment(state.asyncCount))
            }
    }
}

val effectHandler = EffectHandler<Effect, InternalMsg> { effect, dispatch ->
    when (effect) {
        is Effect.Increment -> {
            delay(1_000)
            dispatch(InternalMsg.CompletedAsyncOperation(effect.value.inc()))
        }
    }
}
