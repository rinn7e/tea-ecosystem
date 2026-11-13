#[derive(Debug, Clone, Default)]
pub struct Model {
    pub counter: u64,
}

impl Model {
    pub fn increment_counter(model: Model) -> Model {
        Model {
            counter: model.counter + 1,
        }
    }

    pub fn decrement_counter(model: Model) -> Model {
        let counter = if model.counter == 0 {
            0
        } else {
            model.counter - 1
        };

        Model { counter }
    }
}

#[derive(Debug)]
pub enum Message {
    IncCounter,
    DecCounter,
    Exit,
    NoOp,
}

pub fn update(model: Model, msg: Message) -> Update<Model, Effect> {
    match msg {
        Message::Exit => Update::Exit,
        Message::NoOp => Update::Next(model, None),
        Message::IncCounter => Update::Next(Model::increment_counter(model), None),
        Message::DecCounter => Update::Next(Model::decrement_counter(model), None),
    }
}

pub fn view(model: Model) -> Paragraph<'static> {
    let counter = model.counter;

    let title = Line::from("Ratatui Actor-based Counter")
        .bold()
        .blue()
        .centered();

    let text = format!(
        r#"Counter TUI!
        
Counter: {counter}
        
Press `Esc`, `Ctrl-C` or `q` to stop running."#
    );

    Paragraph::new(text)
        .block(Block::bordered().title(title))
        .centered()
}
