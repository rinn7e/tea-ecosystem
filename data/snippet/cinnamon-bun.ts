// Define your model
interface CounterModel {
  count: number
}

// Initialize the model
function init(): [Model, Cmd] {
  return [{ count: 0 }, null]
}

// Handle messages
function update(model: CounterModel, msg: Msg): [Model, Cmd] {
  if (msg?.type === "key") {
    switch (msg.name) {
      case "up":
        return [{ ...model, count: model.count + 1 }, null]
      case "down":
        return [{ ...model, count: model.count - 1 }, null]
      case "q":
        return [model, Quit()]
    }
  }
  return [model, null]
}

// Render the UI
function view(model: CounterModel): string {
  return `
Count: ${model.count}

Press up to increment, down to decrement, q to quit.
`
}

// Run the program
NewProgram({ model: { init, update, view } }).run()
