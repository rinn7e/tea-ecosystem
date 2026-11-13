typealias CounterModel = Int

enum CounterEvent {
    case increment
    case decrement
}

enum CounterEffect {
    case playSound
}

func update(model: CounterModel, event: CounterEvent) -> Next<CounterModel, CounterEffect> {
    switch event {
    case .increment: 
        return .next(model + 1)
    case .decrement:
        if model == 0 {
            return .dispatchEffects([.playSound])
        } else {
            return .next(model - 1)
        }
    }
}

let effectHandler = EffectRouter<CounterEffect, CounterEvent>()
    .routeCase(CounterEffect.playSound).to { beep() }
    .asConnectable

let application = Mobius.loop(update: update, effectHandler: effectHandler)
    .start(from: 0)

application.dispatchEvent(.increment)
application.dispatchEvent(.decrement)
application.dispatchEvent(.decrement)
