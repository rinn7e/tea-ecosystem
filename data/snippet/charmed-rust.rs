#[derive(bubbletea::Model)]
struct Counter {
    count: i32,
}

impl Counter {
    fn new() -> Self {
        Self { count: 0 }
    }

    fn init(&self) -> Option<Cmd> {
        None
    }

    fn update(&mut self, msg: Message) -> Option<Cmd> {
        if let Some(key) = msg.downcast_ref::<KeyMsg>() {
            match key.key_type {
                KeyType::Runes => {
                    if let Some(&ch) = key.runes.first() {
                        match ch {
                            '+' | '=' | 'k' => self.count += 1,
                            '-' | '_' | 'j' => self.count -= 1,
                            'q' | 'Q' => return Some(quit()),
                            _ => {}
                        }
                    }
                }
                KeyType::Up => self.count += 1,
                KeyType::Down => self.count -= 1,
                KeyType::CtrlC | KeyType::Esc => return Some(quit()),
                _ => {}
            }
        }
        None
    }

    fn view(&self) -> String {
        format!(
            "\n  Counter: {}\n\n  [+/-] or [k/j] to change\n  [q] or [Esc] to quit\n",
            self.count
        )
    }
}

fn main() -> anyhow::Result<()> {
    let final_model = Program::new(Counter::new()).with_alt_screen().run()?;

    println!("Final count: {}", final_model.count);
    Ok(())
}
