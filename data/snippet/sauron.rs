enum Msg {
    Increment,
    Decrement,
    Reset,
}

struct App {
    count: i32,
}

impl App {
    fn new() -> Self {
        App { count: 0 }
    }
}

impl Application for App {
    type MSG = Msg;

    fn view(&self) -> Node<Msg> {
        node! {
            <main>
                <input type="button"
                    value="+"
                    on_click=|_| {
                        Msg::Increment
                    }
                />
                <button class="count" on_click=|_|{Msg::Reset} >{text(self.count)}</button>
                <input type="button"
                    value="-"
                    on_click=|_| {
                        Msg::Decrement
                    }
                />
            </main>
        }
    }

    fn update(&mut self, msg: Msg) -> Cmd<Msg> {
        match msg {
            Msg::Increment => self.count += 1,
            Msg::Decrement => self.count -= 1,
            Msg::Reset => self.count = 0,
        }
        Cmd::none()
    }
}
