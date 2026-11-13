final class SnakeIn5Minutes() extends Game[Unit, Unit, SnakeModel]:

  def initialModel(startupData: Unit): Outcome[SnakeModel] =
    Outcome(SnakeModel(Point(10, 10), 20, Point(15, 15), Point.zero, Nil, 5))

  def updateModel(context: Context, model: SnakeModel): GlobalEvent => Outcome[SnakeModel] =
    case KeyboardEvent.KeyDown(Key.ARROW_LEFT) =>
      Outcome(model.copy(direction = Point(-1, 0)))

    case _ =>
      Outcome(model)

  def present(context: Context, model: SnakeModel): Outcome[SceneUpdateFragment] =
    val boxSize = Rectangle(1, 1, 18, 18)
    Outcome(
      SceneUpdateFragment(
        LayerKey("game") -> Layer.Content(
          Shape
            .Box(boxSize, Fill.Color(RGBA.Red))
            .moveTo(model.apple * model.gridSize) :: model.trail
            .map(coords =>
              Shape
                .Box(boxSize, Fill.Color(RGBA.fromHexString("00ff1b")))
                .moveTo(coords * model.gridSize)
            )
            .toBatch
        )
      )
    )

final case class SnakeModel(
    head: Point,
    gridSize: Int,
    apple: Point,
    direction: Point,
    trail: List[Point],
    tail: Int
)
