abstract class CounterEvent {}

class CounterIncrementPressed extends CounterEvent {}

class CounterBloc extends Bloc<CounterEvent, int> {
  CounterBloc() : super(0) {
    on<CounterIncrementPressed>((event, emit) => emit(state + 1));
  }
}

Future<void> blocMain() async {
  final bloc = CounterBloc();

  print(bloc.state);

  bloc.add(CounterIncrementPressed());

  await Future<void>.delayed(Duration.zero);

  print(bloc.state);

  await bloc.close();
}
