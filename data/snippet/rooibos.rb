Model = Data.define(:text)

Init = -> do
  Model.new(text: "Hello, Ratatui! Press 'q' to quit.")
end

View = -> (model, tui) do
  tui.paragraph(
    text: model.text,
    alignment: :center,
    block: tui.block(
      title: "My Ruby TUI App",
      borders: [:all],
      border_style: { fg: "cyan" }
    )
  )
end

Update = -> (msg, model) do
  if msg.q? || msg.ctrl_c?
    Rooibos::Command.exit
  else
    model
  end
end
