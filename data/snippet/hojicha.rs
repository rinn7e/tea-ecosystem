use hojicha::prelude::*;

struct Counter {
    value: i32,
}

impl Model for Counter {
    type Message = ();

    fn update(&mut self, event: Event<()>) -> Cmd<()> {
        match event {
            Event::Key(key) => match key.key {
                Key::Up => self.value += 1,
                Key::Down => self.value -= 1,
                Key::Char('q') => return quit(),
                _ => {}
            },
            _ => {}
        }
        Cmd::noop()
    }
}

fn main() -> Result<()> {
    Program::new(Counter { value: 0 })?.run()
}
