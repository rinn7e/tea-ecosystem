defmodule Counter do
  use TermUI.Elm

  alias TermUI.{Command, Event, Frame, Style}

  def init(opts) do
    %{count: 0, dimensions: Keyword.fetch!(opts, :dimensions)}
  end

  def event_to_msg(%Event.Key{key: :up}, _state), do: {:msg, :increment}
  def event_to_msg(%Event.Key{key: :down}, _state), do: {:msg, :decrement}
  def event_to_msg(%Event.Text{text: text}, _state) when text in ["q", "Q"],
    do: {:msg, :quit}

  def event_to_msg(%Event.Resize{width: width, height: height}, _state),
    do: {:msg, {:resize, width, height}}

  def event_to_msg(_event, _state), do: :ignore

  def update(:increment, state), do: %{state | count: state.count + 1}
  def update(:decrement, state), do: %{state | count: state.count - 1}
  def update(:quit, state), do: {state, [Command.shutdown()]}
  def update({:resize, width, height}, state), do: %{state | dimensions: {width, height}}

  def view(%{count: count, dimensions: {width, height}}) do
    heading = Style.new(fg: :cyan, attrs: [:bold])

    Frame.from_rows(
      [[{"Counter", heading}], "", "Count: #{count}", "", "Up/Down: change  Q: quit"],
      width,
      height
    )
  end
end

TermUI.run(Counter)
