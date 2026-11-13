import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import {
  siClojure,
  siDart,
  siDotnet,
  siElixir,
  siElm,
  siFsharp,
  siGleam,
  siGo,
  siHaskell,
  siJavascript,
  siKotlin,
  siOcaml,
  siPurescript,
  siPython,
  siRust,
  siScala,
  siSwift,
  siTypescript,
} from 'simple-icons'

import { javaLogoPaths } from './java-logo'

// The logo of a language: its name, the box its shapes are drawn in, and
// each shape with its color. A logo of Simple Icons (CC0) is one shape in a
// 24 x 24 box; the Java cup has its own (`java-logo.ts`).
export type LanguageLogo = {
  title: string
  viewBox: string
  paths: { d: string; fill: string }[]
}

type Rgb = [number, number, number]

const rgbOfHex = (hex: string): Rgb => [
  parseInt(hex.slice(0, 2), 16) / 255,
  parseInt(hex.slice(2, 4), 16) / 255,
  parseInt(hex.slice(4, 6), 16) / 255,
]

const hexOfRgb = (rgb: Rgb): string =>
  `#${rgb
    .map((c) =>
      Math.round(c * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`

// The relative luminance of WCAG
const luminanceOf = ([r, g, b]: Rgb): number => {
  const linear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

// The same hue at another lightness: towards black for a step below 0,
// towards white above
const shadeOf =
  (step: number) =>
  ([r, g, b]: Rgb): Rgb =>
    step < 0
      ? [r * (1 + step), g * (1 + step), b * (1 + step)]
      : [r + (1 - r) * step, g + (1 - g) * step, b + (1 - b) * step]

// A logo color has 3:1 against both the white panel and the navy panel of
// dark mode (`--panel` in `src/asset/index.css`) when its luminance is in
// this band, so one color serves both modes
const LUMINANCE_MIN = 0.14
const LUMINANCE_MAX = 0.29

const isReadable = (rgb: Rgb): boolean =>
  luminanceOf(rgb) >= LUMINANCE_MIN && luminanceOf(rgb) <= LUMINANCE_MAX

// The brand color of the logo when it reads on both panels, else the
// nearest shade of it that does: black logos (Rust) turn grey, pale ones
// (Gleam, JavaScript) deeper
export const readableColorOf = (hex: string): string => {
  const rgb = rgbOfHex(hex)
  const direction = luminanceOf(rgb) > LUMINANCE_MAX ? -1 : 1
  return pipe(
    A.range(0, 100),
    A.map((percent) => shadeOf((direction * percent) / 100)(rgb)),
    A.findFirst(isReadable),
    O.getOrElse(() => rgb),
    hexOfRgb,
  )
}

const logoOf = (icon: {
  title: string
  path: string
  hex: string
}): LanguageLogo => ({
  title: icon.title,
  viewBox: '0 0 24 24',
  paths: [{ d: icon.path, fill: readableColorOf(icon.hex) }],
})

const javaLogo: LanguageLogo = {
  title: 'Java',
  viewBox: '0 0 128 128',
  paths: javaLogoPaths,
}

// By the `language` of the data files. A language with none here (Gren)
// is drawn as a monogram instead.
const logos: Record<string, LanguageLogo> = {
  Elm: logoOf(siElm),
  Haskell: logoOf(siHaskell),
  PureScript: logoOf(siPurescript),
  'F#': logoOf(siFsharp),
  OCaml: logoOf(siOcaml),
  Gleam: logoOf(siGleam),
  Elixir: logoOf(siElixir),
  Scala: logoOf(siScala),
  TypeScript: logoOf(siTypescript),
  JavaScript: logoOf(siJavascript),
  Rust: logoOf(siRust),
  Go: logoOf(siGo),
  Swift: logoOf(siSwift),
  Java: javaLogo,
  Kotlin: logoOf(siKotlin),
  'Kotlin and Swift': logoOf(siKotlin),
  Dart: logoOf(siDart),
  Python: logoOf(siPython),
  ClojureScript: logoOf(siClojure),
  'C#': logoOf(siDotnet),
}

export const languageLogoOf = (language: string): O.Option<LanguageLogo> =>
  O.fromNullable(logos[language])

// Two letters for a name with no logo: the first letters of its first two
// words ("Bubble Tea" -> "BT", "Elmish (Fable)" -> "EF"), else its first two
// letters ("Lustre" -> "Lu")
export const monogramOf = (name: string): string => {
  const words = pipe(
    name.replace(/[^A-Za-z0-9 ]+/g, ' ').split(' '),
    A.filter((word) => word !== ''),
  )
  const [first = '', second = ''] = words
  return second !== ''
    ? `${first.charAt(0)}${second.charAt(0)}`.toUpperCase()
    : `${first.charAt(0).toUpperCase()}${first.charAt(1).toLowerCase()}`
}
