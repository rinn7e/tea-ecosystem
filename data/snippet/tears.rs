#[derive(Debug, Clone)]
enum Message {
    Tick,
    Input(Event),
    InputError(String),
}

struct Counter {
    count: u32,
}

impl Application for Counter {
    type Message = Message;
    type Flags = ();

    fn update(&mut self, msg: Message) -> Command<Message> {
        match msg {
            Message::Tick => {
                self.count += 1;
                Command::none()
            }
            Message::Input(Event::Key(key)) if key.code == KeyCode::Char('q') => {
                Command::quit()
            }
            Message::InputError(e) => {
                eprintln!("Input error: {e}");
                Command::quit()
            }
            _ => Command::none(),
        }
    }

    fn view(&self, frame: &mut Frame) {
        let text = Text::raw(format!("Count: {} (Press 'q' to quit)", self.count));
        frame.render_widget(text, frame.area());
    }

    fn subscriptions(&self) -> Vec<Subscription<Message>> {
        vec![
            Subscription::new(Timer::new(NonZeroU64::new(1000).expect("non-zero"))).map(|timer_msg| {
                match timer_msg {
                    TimerEvent::Tick => Message::Tick,
                }
            }),
            Subscription::new(TerminalEvents::new()).map(|result| match result {
                Ok(event) => Message::Input(event),
                Err(e) => Message::InputError(e.to_string()),
            }),
        ]
    }
}
