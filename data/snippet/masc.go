type ClickMsg struct{}

type InputMsg struct{ Value string }

type PageView struct {
	masc.Core

	clicks int
	input  string
}

func (p *PageView) Init() masc.Cmd {
	p.input = "masc user"
	return nil
}

func (p *PageView) Update(msg masc.Msg) (masc.Model, masc.Cmd) {
	switch m := msg.(type) {
	case ClickMsg:
		p.clicks++
	case InputMsg:
		p.input = m.Value
	}
	return p, nil
}

func (p *PageView) Render(send func(masc.Msg)) masc.ComponentOrHTML {
	return elem.Body(
		masc.Markup(
			event.Click(func(e *masc.Event) {
				send(ClickMsg{})
			}),
		),
		elem.Input(
			masc.Markup(
				masc.Property("type", "text"),
				masc.Property("value", p.input),
				event.Input(func(e *masc.Event) {
					v := e.Target.Get("value").String()
					send(InputMsg{Value: v})
				}),
			),
		),
		elem.Break(),
		masc.Text("Hello "+p.input+""+strings.Repeat("!", p.clicks)),
	)
}
