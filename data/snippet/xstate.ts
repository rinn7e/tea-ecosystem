import { createActor, createMachine } from 'xstate'

const playerMachine = createMachine({
  initial: 'stopped',
  states: {
    stopped: {
      on: { play: { target: 'playing' } },
    },
    playing: {
      on: {
        pause: { target: 'paused' },
        stop: { target: 'stopped' },
      },
    },
    paused: {
      on: {
        play: { target: 'playing' },
        stop: { target: 'stopped' },
      },
    },
  },
})

const player = createActor(playerMachine).start()

player.send({ type: 'pause' })
console.log(player.getSnapshot().value) // 'stopped'

player.send({ type: 'play' })
console.log(player.getSnapshot().value) // 'playing'
