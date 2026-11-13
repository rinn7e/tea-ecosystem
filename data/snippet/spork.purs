type Model = Int

data Action = Inc | Dec

update ∷ Model → Action → Model
update i = case _ of
  Inc → i + 1
  Dec → i - 1

render ∷ Model → Html Action
render i =
  H.div []
    [ H.button
        [ H.onClick (H.always_ Inc) ]
        [ H.text "+" ]
    , H.button
        [ H.onClick (H.always_ Dec) ]
        [ H.text "-" ]
    , H.span []
        [ H.text (show i)
        ]
    ]

app ∷ PureApp Model Action
app = { update, render, init: 0 }

main ∷ Effect Unit
main = void $ PureApp.makeWithSelector app "#app"
