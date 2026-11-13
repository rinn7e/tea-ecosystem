type Model struct {
    count int
}

func (m Model) Init() tea.Cmd { return nil }

func (m Model) Update(msg tea.Msg) (Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        if msg.String() == "q" {
            return m, phoenix.Quit()
        }
        m.count++
    }
    return m, nil
}

func (m Model) View() string {
    style := phoenix.NewStyle().Foreground("#00FF00").Bold()
    return style.Render(fmt.Sprintf("Count: %d\n", m.count))
}

func main() {
    p := phoenix.NewProgram(Model{}, phoenix.WithAltScreen[Model]())
    if err := p.Run(); err != nil {
        fmt.Fprintf(os.Stderr, "Error: %v\n", err)
        os.Exit(1)
    }
}
