struct App {
    counter: usize,
}

enum Message {
    Increment,
    Decrement,
}

impl Program for App {
    type Message = Message;

    fn init(&mut self, _: Mailbox<Self::Message>) -> Command<Self::Message> {
        // send an Increment message right away
        Command::send(Message::Increment)
    }

    fn update(&mut self, message: Self::Message) -> Command<Self::Message> {
        match message {
            Message::Increment => self.counter += 1,
            Message::Decrement => self.counter -= 1,
        }

        Command::none()
    }

    fn view(&self) -> String {
        format!("count: {}\n", self.counter)
    }
}

fn main() {
    let app = App::new();
    let config = Config::default();
    app.run(&mut config).unwrap();
}
