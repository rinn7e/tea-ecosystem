#[derive(Clone, Debug)]
pub enum Message {
    EditMode(bool),
    Input(String),
}

pub struct App {
    core: Core,
    input: String,
    editing: bool,
    search_id: cosmic::widget::Id,
}

impl cosmic::Application for App {
    type Message = Message;
    fn update(&mut self, message: Self::Message) -> Task<Self::Message> {
        match message {
            Message::Input(text) => {
                self.input = text;
            }

            Message::EditMode(editing) => {
                self.editing = editing;
            }
        }

        Task::none()
    }

    fn view(&self) -> Element<'_, Self::Message> {
        let editable = cosmic::widget::editable_input(
            "Input text here",
            &self.input,
            self.editing,
            Message::EditMode,
        )
        .on_input(Message::Input)
        .id(self.search_id.clone());

        let inline = cosmic::widget::inline_input("", &self.input).on_input(Message::Input);

        let column = cosmic::widget::column::with_capacity(2)
            .push(editable)
            .push(inline);

        let centered = cosmic::widget::container(column.width(200))
            .width(iced::Length::Fill)
            .height(iced::Length::Shrink)
            .align_x(iced::Alignment::Center)
            .align_y(iced::Alignment::Center);

        Element::from(centered)
    }
}
