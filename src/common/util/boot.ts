import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import * as t from 'io-ts'

// The time and the width of the window a page was rendered with ahead of
// time (`src/prerender.tsx`), written into its HTML. The first render in
// the browser takes them too, so it draws the very page the HTML holds and
// React hydrates it instead of drawing it again; the real time and width
// follow right after (`liveValuesCmd` in `src/program.tsx`).
export type Boot = { now: number; windowWidth: number }

export const BootJson: t.Type<Boot> = t.type({
  now: t.number,
  windowWidth: t.number,
})

export const BOOT_ELEMENT_ID = 'boot'

// The script element that holds them, in a prerendered page
export const bootScriptOf = (boot: Boot): string =>
  `<script type="application/json" id="${BOOT_ELEMENT_ID}">${JSON.stringify(boot)}</script>`

const parseJson = (text: string): O.Option<unknown> =>
  O.tryCatch((): unknown => JSON.parse(text))

// None on a page that was not rendered ahead of time (the dev server,
// `404.html`)
// The part of the page it reads: `document` in the browser
export type BootSource = {
  getElementById: (id: string) => { textContent: string | null } | null
}

export const bootOf = (doc: BootSource): O.Option<Boot> =>
  pipe(
    O.fromNullable(doc.getElementById(BOOT_ELEMENT_ID)?.textContent),
    O.chain(parseJson),
    O.chain((json) =>
      O.fromEither(
        pipe(
          BootJson.decode(json),
          E.mapLeft(() => undefined),
        ),
      ),
    ),
  )
