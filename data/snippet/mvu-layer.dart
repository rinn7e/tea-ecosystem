/// The model
class CounterState {
  final int count;

  const CounterState(this.count);
}

/// The messages
sealed class CounterMsgType {}
class Increment extends CounterMsgType {}
class Decrement extends CounterMsgType {}

/// The init
(CounterState, Cmd<CounterMsgType>) init() => (const CounterState(0), Cmd.none());

/// The update
(CounterState, Cmd<CounterMsgType>) update(CounterMsgType msg, CounterState state) => switch(msg) {
  Increment() => (CounterState(state.count + 1), Cmd.none()),
  Decrement() => (CounterState(state.count - 1), Cmd.none())
};

/// The view
Widget view(BuildContext context, CounterState state, Dispatch<CounterMsgType> dispatch) =>
    Column(
      children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
          TextButton(
              key: const ValueKey('Increment'),
              onPressed: () => dispatch(Increment()),
              child: const Text('Increment')),
          TextButton(
              key: const ValueKey('Decrement'),
              onPressed: () => dispatch(Decrement()),
              child: const Text('Decrement')),
        ]),
        Text('${state.count}', key: const ValueKey('Counter'))
      ],
    );
/// The glue
Widget example = MVUBuilder(
  init: init,
  update: update,
  view: view,
);
