enum CounterEvent {
  INCREMENT,
  DECREMENT,
}

enum CounterEffect {
  PLAY_SOUND,
}

class CounterLogic implements Update<Integer, CounterEvent, CounterEffect> {
  public Next<Integer, CounterEffect> update(Integer model, CounterEvent event) {
    switch (event) {
      case INCREMENT:
        return next(model + 1);
      case DECREMENT:
        if (model == 0) {
          Set<CounterEffect> soundEffect = effects(CounterEffect.PLAY_SOUND);
          return dispatch(soundEffect);
        }
        return next(model - 1);

    }
    throw new IllegalStateException("Unhandled event: " + event);
  }
}

class CounterEffectHandler implements Connectable<CounterEffect, CounterEvent> {
  public Connection<CounterEffect> connect(Consumer<CounterEvent> output) {
    return new Connection<CounterEffect>() {
      @Override
      public void accept(CounterEffect effect) {
        if (effect == CounterEffect.PLAY_SOUND) {
          Toolkit.getDefaultToolkit().beep();
        }
      }

      @Override
      public void dispose() {}
    };
  }
}

public static void main(String[] args) {
  MobiusLoop<Integer, CounterEvent, CounterEffect> loop = Mobius
      .loop(new CounterLogic(), new CounterEffectHandler())
      .startFrom(0);

  loop.dispatchEvent(CounterEvent.INCREMENT);
  loop.dispatchEvent(CounterEvent.DECREMENT);
  loop.dispatchEvent(CounterEvent.DECREMENT);
}
