type Model = {
  readonly count: number
}

type Msg = { readonly type: "increment" }
const on = bindEvents<Msg>()

const counterProgram = defineProgram<Model, Model, Msg, never>({
  init: (flags) => [flags, []],
  update: (model, message) => {
    switch (message.type) {
      case "increment":
        return [{ count: model.count + 1 }, []]
    }
  },
  view: (model): VNode<Model> =>
    h("button", { onClick: on.clicked({ type: "increment" }) }, String(model.count)),
})
