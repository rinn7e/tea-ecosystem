type Msg = KeyMsg;

class Counter implements Model<Msg> {
  constructor(public count: number = 0) {}

  init(): Cmd<Msg> {
    return null;
  }

  update(msg: Msg): [Model<Msg>, Cmd<Msg>] {
    if (isKey(msg, "up")) return [new Counter(this.count + 1), null];
    if (isKey(msg, "down")) return [new Counter(this.count - 1), null];
    if (isKey(msg, "q")) return [this, () => quit()];
    return [this, null];
  }

  view(): string {
    return style()
      .border("rounded")
      .padding(1)
      .render(`Count: ${this.count}\n\nPress up/down to change, q to quit`);
  }
}

await run(new Counter());
