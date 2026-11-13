type Model = { number :: Int }

data Msg
  = Inc
  | Dec

derive instance eqMsg :: Eq Msg

view :: Model -> Html Msg
view model = div []
  [ div []
      [ button [ onClick Inc ] [ text "+" ]
      , text $ show model.number
      ]
  , div []
      [ button [ onClick Dec ] [ text "-" ]
      , text $ show model.number
      ]
  ]

next :: Msg -> Model -> Cmd Msg
next msg mod = mempty

update :: Msg -> Model -> Model
update msg model = case msg of
  Inc -> model { number = model.number + 1 }
  Dec -> model { number = model.number - 1 }

init :: Model
init = { number: 0 }

subscriptions :: Model -> Array (Subscription Msg)
subscriptions _ = []

app :: App Msg Model
app = createApp { init, view, update, next, subscriptions }
