// MODEL

export const Model = Schema.Struct({ count: Schema.Number })
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedDecrement: {},
  ClickedIncrement: {},
  ClickedReset: {},
})
export type Message = typeof Message.Type

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedDecrement: () => ({
      model: modifyFields(model, { count: (count) => count - 1 }),
    }),
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: (count) => count + 1 }),
    }),
    ClickedReset: () => ({ model: modifyFields(model, { count: () => 0 }) }),
  })

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: { count: 0 },
})

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: `Counter: ${model.count}`,
  body: h.div(
    [],
    [
      h.p([], [model.count.toString()]),
      h.button([h.OnClick(Message.ClickedDecrement())], ['-']),
      h.button([h.OnClick(Message.ClickedReset())], ['Reset']),
      h.button([h.OnClick(Message.ClickedIncrement())], ['+']),
    ],
  ),
})
