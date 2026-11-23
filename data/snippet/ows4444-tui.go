type counter struct{ n int }

func (c counter) Init() tui.Cmd { return nil }

func (c counter) Update(msg tui.Msg) (tui.Model, tui.Cmd) {
	if k, ok := msg.(tui.Key); ok && k.Type == tui.KeyRunes {
		switch k.Text {
		case "+":
			c.n++
		case "q":
			return c, tui.Quit()
		}
	}
	return c, nil
}

func (c counter) View() string { return fmt.Sprintf("count: %d", c.n) }

func ExampleNewProgram() {
	p := tui.NewProgram(counter{},
		tui.WithInput(strings.NewReader("++q")),
		tui.WithOutput(io.Discard),
	)
	final, err := p.Run()
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println(final.View())
}
