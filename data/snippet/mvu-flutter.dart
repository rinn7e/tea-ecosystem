@freezed
class CounterModel extends Model with _$CounterModel {
  const factory CounterModel(int currentValue) = _CounterModel;
}

@freezed
class CounterMsg extends Msg with _$CounterMsg {
  const factory CounterMsg.increment(int amount) = IncrementMsg;
  const factory CounterMsg.decrement(int amount) = DecrementMsg;
}

class UpdateCounter extends Update<CounterModel, CounterMsg> {
  @override
  ProducedState<CounterModel, CounterMsg> update(
          CounterMsg message, CounterModel model) =>
      message.when(
        increment: (amount) => ProducedState(
            model.copyWith(currentValue: model.currentValue + amount)),
        decrement: (amount) => ProducedState(
            model.copyWith(currentValue: model.currentValue - amount)),
      );
}

class CounterView extends View<CounterModel, CounterMsg> {
  @override
  Widget view(BuildContext context, CounterModel model) => Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Counter value: ${model.currentValue}'),
              ElevatedButton(
                onPressed: dispatchCallback(IncrementMsg(10)),
                child: Text("Increment"),
              ),
              ElevatedButton(
                onPressed: dispatchCallback(DecrementMsg(2)),
                child: Text("Decrement"),
              ),
            ],
          ),
        ),
      );
}

final counterProgram = () => Program(
      model: CounterModel(0),
      view: () => CounterView(),
      update: UpdateCounter(),
    );
