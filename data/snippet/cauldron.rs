struct Counter { count: i32 }

enum Msg { Increment, Decrement, Quit }

impl Model for Counter {
    type Message = Msg;

    fn update(&mut self, msg: Msg) -> Command<Msg> {
        match msg {
            Msg::Increment => self.count += 1,
            Msg::Decrement => self.count -= 1,
            Msg::Quit => return Command::quit(),
        }
        Command::none()
    }

    fn view(&self) -> String {
        format!(
            "Count: {}\n\n  Press +/- to change\n  Press q to quit",
            self.count
        )
    }

    fn handle_event(&self, event: Event) -> Option<Msg> {
        match event {
            Event::Key(Key::Char('+')) => Some(Msg::Increment),
            Event::Key(Key::Char('-')) => Some(Msg::Decrement),
            Event::Key(Key::Char('q')) => Some(Msg::Quit),
            Event::Key(Key::Esc) => Some(Msg::Quit),
            _ => None,
        }
    }
}

fn main() {
    App::new(Counter { count: 0 }).run().unwrap();
}
