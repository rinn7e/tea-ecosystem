type Model = { Count: int }

type Msg = Increment | Decrement | Reset

let init () = { Count = 0 }, Cmd.none

let update msg model =
    match msg with
    | Increment -> { model with Count = model.Count + 1 }, Cmd.none
    | Decrement -> { model with Count = model.Count - 1 }, Cmd.none
    | Reset -> { Count = 0 }, Cmd.none

let view model dispatch =
    window
        [ Window.title $"Counter: {model.Count}"
          Window.width 400.0
          Window.height 300.0
          Window.contentChild (
              stackPanel
                  [ StackPanel.children
                        [ textBlock
                              [ TextBlock.text (string model.Count)
                                TextBlock.fontSize 48.0
                                TextBlock.horizontalAlignment HorizontalAlignment.Center ]
                          button
                              [ Button.content " + "
                                Button.onClick (RoutedEventHandler(fun _ _ -> dispatch Increment)) ]
                          button
                              [ Button.content " - "
                                Button.onClick (RoutedEventHandler(fun _ _ -> dispatch Decrement)) ] ] ]
          ) ]

[<STAThread; EntryPoint>]
let main _ =
    Registration.register ()
    Elmish.Program.mkProgram init update view |> Program.runWindow
