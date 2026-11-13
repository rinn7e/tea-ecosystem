struct Counter { count: i32 }

enum Msg { Increment, Decrement, Quit }

impl Model for Counter {
    type Message = Msg;

    fn init(&self) -> Option<Cmd<Self::Message>> { None }

    fn update(&mut self, msg: Self::Message) -> Option<Cmd<Self::Message>> {
        match msg {
            Msg::Increment => self.count += 1,
            Msg::Decrement => self.count -= 1,
            Msg::Quit => return Some(Cmd::quit()),
        }
        None
    }

    fn view(&self) -> String {
        format!("Count: {}\n\nPress +/- to change, q to quit", self.count)
    }

    fn handle_event(&self, event: Event) -> Option<Self::Message> {
        if let Event::Key(key) = event {
            match key.code {
                KeyCode::Char('+') => return Some(Msg::Increment),
                KeyCode::Char('-') => return Some(Msg::Decrement),
                KeyCode::Char('q') => return Some(Msg::Quit),
                _ => {}
            }
        }
        None
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    Program::new(Counter { count: 0 }).run()
}
