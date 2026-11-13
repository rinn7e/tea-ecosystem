import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { describe, expect, it } from 'vitest'

import { destinationOfScreen, frameworkScreen } from '@/common/type/destination'
import { type Model } from '@/type'
import { backOf } from '@/util'

import { bootOn, navigate, urlOf } from '../helper/app'

// The URL and label of the back button of `model`
const backUrlOf = (model: Model) =>
  pipe(
    backOf(model),
    O.map(({ destination, label }) => ({ url: urlOf(destination), label })),
  )

describe('backOf', () => {
  it('goes from an entry page back to its list', () => {
    expect(backUrlOf(bootOn('/framework/miso'))).toEqual(
      O.some({ url: '/', label: 'Back to all frameworks' }),
    )
    expect(backUrlOf(bootOn('/framework/use-reducer'))).toEqual(
      O.some({ url: '/adjacent', label: 'Back to all TEA-adjacent' }),
    )
  })

  it('keeps the filters of the list it goes back to', () => {
    const entry = navigate(
      bootOn('/?language=Rust'),
      destinationOfScreen(frameworkScreen('iced')),
    )
    expect(backUrlOf(entry)).toEqual(
      O.some({ url: '/?language=Rust', label: 'Back to all frameworks' }),
    )
  })

  it('has nothing on the screens that stand alone', () => {
    expect(backUrlOf(bootOn('/'))).toEqual(O.none)
    expect(backUrlOf(bootOn('/about'))).toEqual(O.none)
    expect(backUrlOf(bootOn('/rubric'))).toEqual(O.none)
  })
})
