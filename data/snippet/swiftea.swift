struct InfiniteScrollState: Equatable {
    var currentPage = 0

    var isListEnded = false
    var loadingState: LoadingState = .idle

    var data: [InfiniteScrollModel] = []
}

enum InfiniteScrollEvent: Equatable {
    case loadInitialData
    case updateInitialData(data: [InfiniteScrollModel], isListEnded: Bool)
    case updateDataWithError(error: InfiniteScrollAPIError)
    case receiveCancelAllRequests
}

enum InfiniteScrollCommand: Equatable {
    case loadInitialPageData
    case cancelAllRequests
}

let reducer = Reducer<InfiniteScrollState, InfiniteScrollEvent, InfiniteScrollCommand>(reduce: { state, event in
    switch event {
    case .loadInitialData:
        var state = state
        state.loadingState = .refresh

        return .nextAndDispatchCancellable(
            state,
            commands: [
                .cancelAllRequests,
                .loadInitialPageData,
            ],
            cancellableCommands: [
                .cancelAllRequests,
            ]
        )

    case let .updateInitialData(data, isListEnded):
        var state = state
        state.loadingState = .idle
        state.isListEnded = isListEnded
        state.currentPage = 0
        state.data = data

        return .next(state)

    case let .updateDataWithError(error):
        var state = state
        state.loadingState = .error(error)

        return .next(state)

    case .receiveCancelAllRequests:
        return .empty
    }
})

let commandHanlder = CommandHandler<InfiniteScrollCommand, InfiniteScrollEvent, InfiniteScrollEnvironment>(
    reduce: { command, environment in
        switch command {
        case .loadInitialPageData:
            return environment.infiniteScrollRepository.getInfiniteScrolls(
                with: 0,
                pageLentgth: environment.pageLentgth
            )
            .subscribe(on: environment.backgroundQueue)
            .map { result -> InfiniteScrollEvent in
                .updateInitialData(data: result, isListEnded: result.count < environment.pageLentgth)
            }
            .mapError { _ in
                .networkError
            }
            .catch { error in
                Just<InfiniteScrollEvent>(.updateDataWithError(error: error))
            }
            .eraseToAnyPublisher()

        case .cancelAllRequests:
            return Just<InfiniteScrollEvent>(.receiveCancelAllRequests)
                .eraseToAnyPublisher()
        }
    },
    environment: environment
)
