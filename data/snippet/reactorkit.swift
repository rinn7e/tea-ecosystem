class ProfileViewReactor: Reactor {
  enum Action {
    case refreshFollowingStatus(Int)
    case follow(Int)
  }

  enum Mutation {
    case setFollowing(Bool)
  }

  struct State {
    var isFollowing: Bool = false
  }

  let initialState: State = State()

  func mutate(action: Action) -> Observable<Mutation> {
    switch action {
    case let .refreshFollowingStatus(userID):
      return UserAPI.isFollowing(userID)
        .map { (isFollowing: Bool) -> Mutation in
          return Mutation.setFollowing(isFollowing)
        }

    case let .follow(userID):
      return UserAPI.follow()
        .map { _ -> Mutation in
          return Mutation.setFollowing(true)
        }
    }
  }

  func reduce(state: State, mutation: Mutation) -> State {
    var state = state
    switch mutation {
    case let .setFollowing(isFollowing):
      state.isFollowing = isFollowing
      return state
    }
  }
}
