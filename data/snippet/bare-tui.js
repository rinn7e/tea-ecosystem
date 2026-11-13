class Counter {
  constructor() {
    this.count = 0
  }
  init() {
    return null
  }
  update(msg) {
    if (msg.type !== 'key') return [this, null]
    if (key.matches(msg, 'q', 'ctrl+c')) return [this, quit]
    if (key.matches(msg, 'up', 'k')) this.count++
    if (key.matches(msg, 'down', 'j')) this.count--
    return [this, null]
  }
  view() {
    return `count: ${this.count}\n\n↑/↓ change · q quit`
  }
}

new Program(new Counter()).run()
