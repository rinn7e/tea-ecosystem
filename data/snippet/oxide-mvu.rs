#[derive(Clone)]
enum Event {
    Increment,
}

#[derive(Clone)]
struct Model {
    count: i32,
}

struct Props {
    count: i32,
    on_click: Box<dyn Fn()>,
}

struct Logic;

impl MvuLogic<Event, Model, Props> for Logic {
    fn init(&self, model: Model) -> (Model, Effect<Event>) {
        (model, Effect::none())
    }

    fn update(&self, event: Event, model: &Model) -> (Model, Effect<Event>) {
        match event {
            Event::Increment => (Model { count: model.count + 1 }, Effect::none()),
        }
    }

    fn view(&self, model: &Model, emitter: &Emitter<Event>) -> Props {
        let emitter = emitter.clone();
        Props {
            count: model.count,
            on_click: Box::new(move || emitter.clone().try_emit(Event::Increment)),
        }
    }
}
