pub enum Msg {
    Increment,
    Decrement,
}

pub struct App {
    value: i64, // This will store the counter value
}

impl Component for App {
    type Message = Msg;
    type Properties = ();

    fn create(_ctx: &Context<Self>) -> Self {
        Self { value: 0 }
    }

    fn update(&mut self, _ctx: &Context<Self>, msg: Self::Message) -> bool {
        match msg {
            Msg::Increment => {
                self.value += 1;
                true // Return true to cause the displayed change to update
            }
            Msg::Decrement => {
                self.value -= 1;
                true
            }
        }
    }

    fn view(&self, ctx: &Context<Self>) -> Html {
        html! {
            <div>
                <div class="panel">
                    <button class="button" onclick={ctx.link().callback(|_| Msg::Increment)}>
                        { "+1" }
                    </button>

                    <button onclick={ctx.link().callback(|_| Msg::Decrement)}>
                        { "-1" }
                    </button>
                </div>

                <p class="counter">
                    { self.value }
                </p>
            </div>
        }
    }
}
