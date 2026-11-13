data class CalculatorState(
    val total: Int = 0
)

sealed class CalculatorSideEffect {
    data class Toast(val text: String) : CalculatorSideEffect()
}

class CalculatorViewModel: OrbitContainerHost<CalculatorState, CalculatorState, CalculatorSideEffect>, ViewModel() {

    // Include `orbit-viewmodel` for the factory function
    override val container = orbitContainer<CalculatorState, CalculatorSideEffect>(CalculatorState())

    fun add(number: Int) = intent {
        postSideEffect(CalculatorSideEffect.Toast("Adding $number to ${state.total}!"))

        reduce {
            state.copy(total = state.total + number)
        }
    }
}

@Composable
fun CalculatorScreen(viewModel: CalculatorViewModel) {

    val state = viewModel.collectAsState().value

    viewModel.collectSideEffect { handleSideEffect(it) }

    // render UI using data from 'state'
    ...
}

private fun handleSideEffect(sideEffect: CalculatorSideEffect) {
    when (sideEffect) {
        is CalculatorSideEffect.Toast -> toast(sideEffect.text)
    }
}
