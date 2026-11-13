init : ( Model, Cmd FrontendMsg )
init =
    ( { counter = 0, clientId = "" }, Cmd.none )


update : FrontendMsg -> Model -> ( Model, Cmd FrontendMsg )
update msg model =
    case msg of
        Increment ->
            ( { model | counter = model.counter + 1 }, sendToBackend CounterIncremented )

        Decrement ->
            ( { model | counter = model.counter - 1 }, sendToBackend CounterDecremented )

        FNoop ->
            ( model, Cmd.none )


updateFromBackend : ToFrontend -> Model -> ( Model, Cmd FrontendMsg )
updateFromBackend msg model =
    case msg of
        CounterNewValue newValue clientId ->
            ( { model | counter = newValue, clientId = clientId }, Cmd.none )


view : Model -> Html FrontendMsg
view model =
    Html.div [ style "padding" "30px" ]
        [ Html.button [ onClick Increment ] [ text "+" ]
        , Html.text (String.fromInt model.counter)
        , Html.button [ onClick Decrement ] [ text "-" ]
        , Html.div [] [ Html.text "Click me then refresh me!" ]
        ]
