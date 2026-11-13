import           Miso
import qualified Miso.Html as H
import           Miso.Lens
----------------------------------------------------------------------------
-- | Sum type for App events
data Action
  = AddOne
  | SubtractOne
  | SayHelloWorld
  deriving (Show, Eq)
----------------------------------------------------------------------------
-- | Entry point for a miso application
main :: IO ()
main = startApp defaultEvents app
----------------------------------------------------------------------------
-- | `component` takes as arguments the initial model, update function, view function
app :: App Int Action
app = component 0 updateModel viewModel
----------------------------------------------------------------------------
-- | Updates model, optionally introduces side effects
updateModel :: Action -> Effect context props Int Action
updateModel = \case
  AddOne -> this += 1
  SubtractOne -> this -= 1
  SayHelloWorld -> io_ $ do
    alert "Hello World"
    consoleLog "Hello World"
----------------------------------------------------------------------------
-- | Constructs a virtual DOM from a model
viewModel :: Int -> View context props Int Action
viewModel x = vfrag
    [ H.button_ [ H.onClick AddOne ] [ text "+" ]
    , text (ms x)
    , H.button_ [ H.onClick SubtractOne ] [ text "-" ]
    , H.br_ []
    , H.button_ [ H.onClick SayHelloWorld ] [ text "Alert Hello World!" ]
    ]
----------------------------------------------------------------------------
