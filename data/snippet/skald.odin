
State :: struct { count: int }

Msg :: enum { Inc, Dec }

init :: proc() -> State { return {} }

update :: proc(s: State, m: Msg) -> (State, skald.Command(Msg)) {
    switch m {
    case .Inc: return {count = s.count + 1}, {}
    case .Dec: return {count = s.count - 1}, {}
    }
    return s, {}
}

view :: proc(s: State, ctx: ^skald.Ctx(Msg)) -> skald.View {
    th := ctx.theme
    return skald.col(
        skald.text(fmt.tprintf("Count: %d", s.count),
            th.color.fg, th.font.size_display),
        skald.spacer(th.spacing.xl),
        skald.row(
            skald.button(ctx, "−", Msg.Dec, width = 64),
            skald.button(ctx, "+", Msg.Inc, width = 64,
                bg = th.color.primary, fg = th.color.on_primary),
            spacing = th.spacing.md,
        ),
        padding     = th.spacing.xl,
        main_align  = .Center,
        cross_align = .Center,
    )
}

main :: proc() {
    skald.run(skald.App(State, Msg){
        title  = "Hello",
        size   = {640, 400},
        theme  = skald.theme_dark(),
        init   = init,
        update = update,
        view   = view,
    })
}
