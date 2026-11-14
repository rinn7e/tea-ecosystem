type AppModel struct {
	count int
}

func (m *AppModel) Init() []limoni.Cmd { return nil }

func (m *AppModel) Update(msg limoni.Msg) limoni.UpdateResult {
	press, ok := msg.(limoni.KeyPressMsg)
	if !ok {
		return limoni.UpdateResult{}
	}

	switch press.Key.Type {
	case limoni.KeyEsc:
		return limoni.UpdateResult{Quit: true}
	case limoni.KeyRune:
		switch press.Key.Ch {
		case 'q', 'Q':
			return limoni.UpdateResult{Quit: true}
		case '+', '=':
			m.count++
			return limoni.UpdateResult{Redraw: true}
		case '-', '_':
			m.count--
			return limoni.UpdateResult{Redraw: true}
		}
	}
	return limoni.UpdateResult{}
}

func (m *AppModel) View(frame *limoni.Frame) {
	rows := limoni.SplitVertical(frame.Area(),
		limoni.Fixed(3),
		limoni.Fill(),
		limoni.Fixed(3),
	)

	frame.RenderWidget(&limoni.Paragraph{
		Text:  fmt.Sprintf("Current Counter Value: %d\n\nPress '+' to increment, '-' to decrement.", m.count),
		Style: limoni.Style{Fg: limoni.RGB(0, 255, 200), Modifier: limoni.ModifierBold},
	}, rows[1])
}
