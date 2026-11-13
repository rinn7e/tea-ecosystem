internal interface CalculatorStore : Store<Intent, State, Nothing> {

    sealed interface Intent {
        object Increment : Intent
        object Decrement : Intent
    }

    data class State(
        val value: Long = 0L
    )
}

internal class CalculatorStoreFactory(private val storeFactory: StoreFactory) {

    fun create(): CalculatorStore =
        object : CalculatorStore, Store<Intent, State, Nothing> by storeFactory.create(
            name = "CounterStore",
            initialState = State(),
            reducer = ReducerImpl
        ) {
        }

    private object ReducerImpl : Reducer<State, Intent> {
        override fun State.reduce(msg: Intent): State =
            when (msg) {
                is Intent.Increment -> copy(value = value + 1L)
                is Intent.Decrement -> copy(value = value - 1L)
            }
    }
}
