type incrementMsg struct{}

type model struct{ count int }

var _ tview.Model[model] = model{}

func (m model) Init() tview.Cmd {
	return cmd.SetTitle("Counter")
}

func (m model) Update(msg tview.Msg) (model, tview.Cmd) {
	switch msg := msg.(type) {
	case incrementMsg:
		m.count++
	case tview.KeyMsg:
		if keybind.String(msg) == "q" {
			return m, cmd.Quit{}
		}
	}
	return m, nil
}

func (m model) View() tview.Widget {
	return column.New(
		text.New("Count: "+strconv.Itoa(m.count)),
		row.New(
			button.New(text.New("Increment")).
				OnClick(incrementMsg{}).
				Focused(true),
		),
	)
}

func Example() {
	if err := tview.NewApplication(model{}).Run(); err != nil {
		log.Fatal(err)
	}
}
