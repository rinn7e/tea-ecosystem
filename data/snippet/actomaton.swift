struct State: Sendable {
    var count: Int = 0
}

enum Action: Sendable {
    case increment
    case decrement
}

typealias Environment = Void

let reducer: Reducer<Action, State, Environment, Never>
reducer = Reducer { action, state, environment in
    switch action {
    case .increment:
        state.count += 1
        return Effect.empty
    case .decrement:
        state.count -= 1
        return Effect.empty
    }
}

let actomaton = Actomaton<Action, State, Never>(
    state: State(),
    reducer: reducer
)

await actomaton.send(.increment)
await actomaton.send(.decrement)
