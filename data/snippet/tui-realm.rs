#[derive(Debug, PartialEq)]
pub enum Msg {
    AppClose,
    DigitCounterChanged(isize),
    DigitCounterBlur,
    LetterCounterChanged(isize),
    LetterCounterBlur,
}

impl Model {
    pub fn update(&mut self, msg: Option<Msg>) -> Option<Msg> {
        let msg = msg?;

        self.redraw = true;
        match msg {
            Msg::AppClose => {
                self.quit = true; // Terminate
                None
            }
            Msg::DigitCounterBlur => {
                self.app.active(&Id::LetterCounter).expect("LetterCounter to be mounted");
                None
            }
            Msg::DigitCounterChanged(v) => {
                self
                    .app
                    .attr(
                        &Id::Label,
                        Attribute::Text,
                        AttrValue::String(format!("DigitCounter has now value: {}", v))
                    )
                    .expect("Label to be mounted");
                None
            }
            Msg::LetterCounterBlur => {
                self.app.active(&Id::DigitCounter).expect("DigitCounter to be mounted");
                None
            }
            Msg::LetterCounterChanged(v) => {
                self
                    .app
                    .attr(
                        &Id::Label,
                        Attribute::Text,
                        AttrValue::String(format!("LetterCounter has now value: {}", v))
                    )
                    .expect("Label to be mounted");
                None
            }
        }
    }
}
