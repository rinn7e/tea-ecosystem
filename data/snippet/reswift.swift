struct AppState {
    var counter: Int = 0
}

struct CounterActionIncrease: Action {}
struct CounterActionDecrease: Action {}

func counterReducer(action: Action, state: AppState?) -> AppState {
    var state = state ?? AppState()

    switch action {
    case _ as CounterActionIncrease:
        state.counter += 1
    case _ as CounterActionDecrease:
        state.counter -= 1
    default:
        break
    }

    return state
}

let mainStore = Store<AppState>(
	reducer: counterReducer,
	state: nil
)

class CounterViewController: UIViewController, StoreSubscriber {

    @IBOutlet var counterLabel: UILabel!

    override func viewWillAppear(_ animated: Bool) {
        mainStore.subscribe(self)
    }

    func newState(state: AppState) {
        counterLabel.text = "\(state.counter)"
    }

    @IBAction func increaseButtonTapped(_ sender: UIButton) {
        mainStore.dispatch(
            CounterActionIncrease()
        )
    }

}
