struct Counter { count: i64 }

#[derive(Debug)]
enum Msg { Increment, Decrement, Quit, Noop }

impl Model for Counter {
    type Message = Msg;
    type Flags = ();

    fn init(_: ()) -> (Self, Command<Msg>) {
        (Counter { count: 0 }, Command::none())
    }

    fn update(&mut self, msg: Msg) -> Command<Msg> {
        match msg {
            Msg::Increment => self.count += 1,
            Msg::Decrement => self.count -= 1,
            Msg::Quit      => return Command::quit(),
            Msg::Noop      => {}
        }
        Command::none()
    }

    fn view(&self, frame: &mut Frame) {
        let p = Paragraph::new(format!("Count: {}", self.count));
        frame.render_widget(p, frame.area());
    }

    fn subscriptions(&self) -> Vec<Subscription<Msg>> {
        vec![terminal_events(|ev| match ev {
            TerminalEvent::Key(key) => match key.code {
                KeyCode::Up   => Some(Msg::Increment),
                KeyCode::Down => Some(Msg::Decrement),
                KeyCode::Char('q') | KeyCode::Esc => Some(Msg::Quit),
                _ => Some(Msg::Noop),
            },
            _ => None,
        })]
    }
}
