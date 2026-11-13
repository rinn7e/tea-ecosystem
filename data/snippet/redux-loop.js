import { Cmd, loop } from 'redux-loop'

function fetchUser(userId) {
  return fetch(`/api/users/${userId}`)
}

function userFetchSuccessfulAction(user) {
  return {
    type: 'USER_FETCH_SUCCESSFUL',
    user,
  }
}

function userFetchFailedAction(err) {
  return {
    type: 'USER_FETCH_FAILED',
    err,
  }
}

const initialState = {
  initStarted: false,
  user: null,
  error: null,
}

function reducer(state = initialState, action) {
  switch (action.type) {
    case 'INIT':
      return loop(
        { ...state, initStarted: true },
        Cmd.run(fetchUser, {
          successActionCreator: userFetchSuccessfulAction,
          failActionCreator: userFetchFailedAction,
          args: ['123'],
        }),
      )

    case 'USER_FETCH_SUCCESSFUL':
      return { ...state, user: action.user }

    case 'USER_FETCH_FAILED':
      return { ...state, error: action.error }

    default:
      return state
  }
}
