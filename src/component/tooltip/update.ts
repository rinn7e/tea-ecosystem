import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { Cmd, Task, Time } from 'tea-cup-fp'

import { type Model, type Msg, type Tooltip } from './type'

// How long the pointer rests on a trigger before its tooltip opens, how
// long it fades out (the `duration` of its view), and how long after one
// closes the next opens at once
export const OPEN_DELAY = 300
export const LEAVE_DURATION = 150
export const COOL_DOWN = 400

export const init = (): Model => ({ tooltip: O.none, seq: 0, warm: false })

const afterCmd = (ms: number, msg: Msg): Cmd<Msg> =>
  Task.perform(Time.in(ms), () => msg)

const isShown = (model: Model): boolean =>
  pipe(
    model.tooltip,
    O.exists((t) => t.phase === 'shown'),
  )

// Not one already leaving
const isOpenFor = (model: Model, id: string): boolean =>
  pipe(
    model.tooltip,
    O.exists((t) => t.id === id && t.phase !== 'leaving'),
  )

// Closes the tooltip. A shown one fades out first (`leaving`, then
// `Removed`), and while `warm` the next one opens at once, until the cool
// down; one still waiting just goes.
const closed = (model: Model, warm: boolean): [Model, Cmd<Msg>] => {
  const seq = model.seq + 1
  return isShown(model)
    ? [
        {
          tooltip: pipe(
            model.tooltip,
            O.map((t): Tooltip => ({ ...t, phase: 'leaving' })),
          ),
          seq,
          warm,
        },
        Cmd.batch([
          afterCmd(LEAVE_DURATION, { _tag: 'Removed', seq }),
          warm ? afterCmd(COOL_DOWN, { _tag: 'CooledDown', seq }) : Cmd.none(),
        ]),
      ]
    : [{ tooltip: O.none, seq, warm: warm && model.warm }, Cmd.none()]
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'Hover': {
      const seq = model.seq + 1
      const phase: Tooltip['phase'] =
        model.warm || isShown(model) ? 'shown' : 'waiting'
      const tooltip: Tooltip = {
        id: msg.id,
        anchor: msg.anchor,
        content: msg.content,
        phase,
      }
      return [
        { tooltip: O.some(tooltip), seq, warm: model.warm },
        phase === 'waiting'
          ? afterCmd(OPEN_DELAY, { _tag: 'DelayElapsed', seq })
          : Cmd.none(),
      ]
    }
    case 'Leave':
      return isOpenFor(model, msg.id)
        ? closed(model, true)
        : [model, Cmd.none()]
    case 'Tap':
      return isOpenFor(model, msg.id) && isShown(model)
        ? closed(model, true)
        : [
            {
              tooltip: O.some({
                id: msg.id,
                anchor: msg.anchor,
                content: msg.content,
                phase: 'shown',
              }),
              seq: model.seq + 1,
              warm: model.warm,
            },
            Cmd.none(),
          ]
    case 'DelayElapsed':
      return [
        msg.seq === model.seq
          ? {
              ...model,
              tooltip: pipe(
                model.tooltip,
                O.map((t): Tooltip => ({ ...t, phase: 'shown' })),
              ),
            }
          : model,
        Cmd.none(),
      ]
    case 'Removed':
      return [
        msg.seq === model.seq &&
        pipe(
          model.tooltip,
          O.exists((t) => t.phase === 'leaving'),
        )
          ? { ...model, tooltip: O.none }
          : model,
        Cmd.none(),
      ]
    case 'CooledDown':
      return [
        msg.seq === model.seq ? { ...model, warm: false } : model,
        Cmd.none(),
      ]
    case 'KeyDown':
      return msg.key === 'Escape' && O.isSome(model.tooltip)
        ? closed(model, false)
        : [model, Cmd.none()]
    // The tooltip goes at once, with no fade: the page under it moved, or a
    // press went elsewhere
    case 'Dismiss':
      return O.isNone(model.tooltip)
        ? [model, Cmd.none()]
        : [{ tooltip: O.none, seq: model.seq + 1, warm: false }, Cmd.none()]
  }
}
