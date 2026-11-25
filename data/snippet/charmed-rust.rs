use bubbletea::{quit, Cmd, KeyMsg, KeyType, Message, Model, Program};

const TEAS: [&str; 3] = ["Sencha", "Oolong", "Rooibos"];

struct Menu {
    cursor: usize,
}

impl Model for Menu {
    fn init(&self) -> Option<Cmd> {
        None
    }

    fn update(&mut self, msg: Message) -> Option<Cmd> {
        let key = msg.downcast_ref::<KeyMsg>()?;
        match key.key_type {
            KeyType::Up => self.cursor = self.cursor.saturating_sub(1),
            KeyType::Down => self.cursor = (self.cursor + 1).min(TEAS.len() - 1),
            KeyType::Esc | KeyType::CtrlC => return Some(quit()),
            KeyType::Runes if key.runes.first() == Some(&'q') => return Some(quit()),
            _ => {}
        }
        None
    }

    fn view(&self) -> String {
        let mut out = String::from("Pick a tea:\n\n");
        for (i, tea) in TEAS.iter().enumerate() {
            let mark = if i == self.cursor { ">" } else { " " };
            out.push_str(&format!("{mark} {tea}\n"));
        }
        out.push_str("\nup and down to move, q to quit\n");
        out
    }
}

fn main() -> Result<(), bubbletea::Error> {
    let menu = Program::new(Menu { cursor: 0 }).run()?;
    println!("You picked {}", TEAS[menu.cursor]);
    Ok(())
}
