defmodule MyApp do
  use Raxol.Core.Runtime.Application

  @impl true
  def init(_context) do
    %{count: 0}
  end

  @impl true
  def update(message, model) do
    case message do
      :increment ->
        {%{model | count: model.count + 1}, []}

      :decrement ->
        {%{model | count: model.count - 1}, []}

      %Raxol.Core.Events.Event{type: :key, data: %{key: :char, char: "q"}} ->
        {model, [Directive.stop()]}

      _ ->
        {model, []}
    end
  end

  @impl true
  def view(model) do
    column style: %{padding: 1, gap: 1, align_items: :center} do
      [
        text("Count: #{model.count}", style: [:bold]),
        row style: %{gap: 1} do
          [
            button("=", on_click: :increment),
            button("-", on_click: :decrement)
          ]
        end
      ]
    end
  end

  @impl true
  def subscribe(_model), do: []
end
