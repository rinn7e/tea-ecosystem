typealias Model = Int

enum class Event { ADD, SUB, RESET }

typealias Effect = Unit

val update = Update<Model, Event, Effect> { model, event ->
  when (event) {
      Event.ADD -> next(model + 1)
      Event.SUB -> next((model - 1).coerceAtLeast(0))
      Event.RESET -> next(0)
  }
}

val effectHandler = Connectable<Effect, Event> { output ->
    object : Connection<Effect> {
        override fun accept(value: Effect) = Unit
        override fun dispose() = Unit
    }
}

val loopFactory: MobiusLoop.Factory = Mobius.loop(update, effectHandler)
val loop: MobiusLoop = loopFactory.startFrom(0)

val observerRef: Disposable = loop.observer { model ->
   println("Model: $model")
}
loop.dispatchEvent(Event.ADD)
loop.dispatchEvent(Event.ADD)
loop.dispatchEvent(Event.SUB)
loop.dispatchEvent(Event.RESET)
loop.dispatchEvent(Event.SUB)
loop.dispose()
