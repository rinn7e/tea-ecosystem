struct Counter { count: i32 }

enum Msg { Increment, Decrement, Quit }

impl Tea for Counter {
    type Msg = Msg;

    fn update(&mut self, msg: Msg) -> Cmd<Msg> {
        match msg {
            Msg::Increment => { self.count += 1; Cmd::dirty() }
            Msg::Decrement => { self.count -= 1; Cmd::dirty() }
            Msg::Quit => Cmd::quit(),
        }
    }

    fn view(&mut self, frame: &mut Frame) {
        let text = format!("Count: {}", self.count);
        frame.render_widget(Paragraph::new(text), frame.area());
    }
}
