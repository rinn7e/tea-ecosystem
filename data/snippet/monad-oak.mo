type Msg { increment }

def update (m : I64) (msg : Msg) : Pair I64 (Command Unit Msg) :=
    match msg { Msg.increment => Pair.pair (m + 1i64) Command.none }

def view (m : I64) : Oak.Node Msg :=
    Html.div [Html.id_ "app"]
        [Html.text (I64.to_string m),
            Html.button [Html.on_click Msg.increment] [Html.text "add"]]

def app : Program I64 Msg Unit := Program.app 0i64 update view

def host : Host IO Unit Msg := Host.host (fn _e => IO.pure Option.none)

#[export "c"] def oak_mount : IO Unit := Runtime.mount app
#[export "c"] def oak_dispatch_event (handler : I64) : IO Unit := Runtime.dispatch handler
#[export "c"] def oak_tick : IO Unit := Runtime.tick app host
