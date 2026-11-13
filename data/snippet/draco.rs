#[derive(Default)]
pub struct Counter {
    value: i32,
}

pub enum Message {
    Increment,
    Decrement,
    Reset,
}

impl draco::Application for Counter {
    type Message = Message;

    fn update(&mut self, message: Self::Message, _: &draco::Mailbox<Self::Message>) {
        match message {
            Message::Increment => self.value += 1,
            Message::Decrement => self.value -= 1,
            Message::Reset => self.value = 0,
        }
    }

    fn view(&self) -> draco::VNode<Self::Message> {
        use draco::html as h;
        h::div()
            .with((
                h::button().on("click", |_| Message::Decrement).with("-"),
                " ",
                self.value,
                " ",
                h::button().with("+").on("click", |_| Message::Increment),
                " ",
                h::button().with("Reset").on("click", |_| Message::Reset),
            ))
            .into()
    }
}
