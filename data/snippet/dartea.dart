class Model {
  final int counter;
  Model(this.counter);
}

abstract class Message {}
class Increment implements Message {}
class Decrement implements Message {}

Widget view(BuildContext context, Dispatch<Message> dispatch, Model model) {
  return Scaffold(
    appBar: AppBar(
      title: Text('Simple dartea counter'),
    ),
    body: Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: <Widget>[
          Text(
            '${model.counter}',
            style: Theme.of(context).textTheme.display1,
          ),
          Padding(
            child: RaisedButton.icon(
              label: Text('Increment'),
              icon: Icon(Icons.add),
              onPressed:() => dispatch(Increment()),
            ),
            padding: EdgeInsets.all(5.0),
          ),
          RaisedButton.icon(
            label: Text('Decrement'),
            icon: Icon(Icons.remove),
            onPressed:  () => dispatch(Decrement()),
          ),
        ],
      ),
    ),
  );
}

Upd<Model, Message> update(Message msg, Model model) {
  if (msg is Increment) {
    return Upd(Model(model.counter + 1));
  }
  if (msg is Decrement) {
    return Upd(Model(model.counter - 1));
  }
  return Upd(model);
}

void main() {
  final program = Program(
      () => Model(0), //create initial state
      update,
      view);
  runApp(MyApp(program));
}
