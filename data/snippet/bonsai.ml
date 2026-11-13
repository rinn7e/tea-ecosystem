module Dice = struct
  let faces =
    [ "⚀"; "⚁"; "⚂"; "⚃"; "⚄"; "⚅" ]
  ;;

  let component (graph @ local) =
    let face, set_face = Bonsai.state (List.hd_exn faces) graph in
    let%arr face and set_face in
    {%html|
      <div>
        You rolled a #{face}
        <button
          style="" on_click=%{fun _ ->
            let index = Random.int (List.length faces) in
            set_face (List.nth_exn faces index)}
        >
          Roll the dice
        </button>
      </div>
    |}
  ;;
end
