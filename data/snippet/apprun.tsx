// define the initial state
const state = 0

// view is a function to display the state (JSX)
const view = (state) => (
  <div>
    <h1>{state}</h1>
    <button onclick="app.run('-1')">-1</button>
    <button onclick="app.run('+1')">+1</button>
  </div>
)

// update is a collection of event handlers
const update = {
  '+1': (state) => state + 1,
  '-1': (state) => state - 1,
}

// start the app
app.start(document.body, state, view, update)
