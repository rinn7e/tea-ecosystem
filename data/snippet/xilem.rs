use winit::error::EventLoopError;
use xilem::view::{text_button, flex_col, label};
use xilem::{EventLoop, WindowOptions, WidgetView, Xilem};

struct Counter(i32);

fn app_logic(data: &mut Counter) -> impl WidgetView<Counter> + use<> {
    flex_col((
        label(format!("{}", data.0)),
        text_button("increment", |data: &mut Counter| data.0 += 1),
    ))
}

fn main() -> Result<(), EventLoopError> {
    let app = Xilem::new_simple(Counter(0), app_logic, WindowOptions::new("Counter app"));
    app.run_in(EventLoop::with_user_event())?;
    Ok(())
}
