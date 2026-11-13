final class CounterState {
  const CounterState({required this.count});
  final int count;
}

sealed class CounterMessage {}
final class Increment extends CounterMessage {}
final class Decrement extends CounterMessage {}

sealed class CounterEffect {}
final class SaveCount extends CounterEffect {
  const SaveCount(this.count);
  final int count;
}

Next<CounterState, CounterEffect> counterUpdate(
  CounterState state,
  CounterMessage message,
) =>
    switch (message) {
      Increment() => next(
          state: CounterState(count: state.count + 1),
          effects: [SaveCount(state.count + 1)],  // Emit save effect
        ),
      Decrement() => next(
          state: CounterState(count: state.count - 1),
          effects: [SaveCount(state.count - 1)],  // Emit save effect
        ),
    };

final class SaveCountHandler
    implements EffectHandler<CounterEffect, CounterMessage> {
  const SaveCountHandler(this._storage);
  final CounterStorage _storage;

  @override
  Future<void> call(
    CounterEffect effect,
    MsgEmitter<CounterMessage> emit,
  ) async {
    switch (effect) {
      case SaveCount(:final count):
        await _storage.saveCount(count);
    }
  }
}

final feature = Feature<CounterState, CounterMessage, CounterEffect>(
  initialState: const CounterState(count: 0),
  update: counterUpdate,
  effectHandlers: [SaveCountHandler(storage)],  // Register handler
);
