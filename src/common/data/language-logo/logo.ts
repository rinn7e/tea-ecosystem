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
  siOdin,
  siPurescript,
  siPython,
  siRuby,
  siRust,
  siScala,
  siSwift,
  siTypescript,
  siZig,
} from 'simple-icons'

import { javaLogoPaths } from './java'
import { leanLogoPaths } from './lean'
import { type LogoPath } from './path'
import { powershellLogoPaths } from './powershell'
import { rocLogoPaths } from './roc'
import { skyLogoPaths } from './sky'

// The logo of a language: its name, and either its shapes (`Shapes`: the
// box they are drawn in, each shape with its color) or a picture in
// `public/logo/` (`Image`), for a language whose logo exists only as a
// picture (Gren: the bird of gren-lang.org; Monad: the standing stone of
// monad-lang.org, without the words over it, in the dark of its site made
// readable on both panels: `readableColorOf('0d1117')`, #67696d). A logo
// of Simple Icons (CC0) is one shape in a 24 x 24 box; the languages it
// does not carry have their own files in this folder (Java, PowerShell,
// Roc, Lean, Sky: `<language>.ts`), drawn with the shapes of `path.ts`.
export type LanguageLogo =
  | { _tag: 'Shapes'; title: string; viewBox: string; paths: LogoPath[] }
  | { _tag: 'Image'; title: string; file: string }

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
  _tag: 'Shapes',
  title: icon.title,
  viewBox: '0 0 24 24',
  paths: [{ d: icon.path, fill: readableColorOf(icon.hex) }],
})

const ownLogo = (
  title: string,
  viewBox: string,
  paths: LogoPath[],
): LanguageLogo => ({ _tag: 'Shapes', title, viewBox, paths })

const javaLogo: LanguageLogo = {
  _tag: 'Shapes',
  title: 'Java',
  viewBox: '0 0 128 128',
  paths: javaLogoPaths,
}

// By the `language` of the data files. A language with none here is drawn
// as a monogram instead.
const logos: Record<string, LanguageLogo> = {
  Elm: logoOf(siElm),
  Gren: { _tag: 'Image', title: 'Gren', file: 'gren.png' },
  Monad: { _tag: 'Image', title: 'Monad', file: 'monad.svg' },
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
  'F# and C#': logoOf(siFsharp),
  Ruby: logoOf(siRuby),
  Zig: logoOf(siZig),
  Odin: logoOf(siOdin),
  PowerShell: ownLogo('PowerShell', '0 0 128 128', powershellLogoPaths),
  Roc: ownLogo('Roc', '0 0 52 53', rocLogoPaths),
  Lean: ownLogo('Lean', '0 0 240 114', leanLogoPaths),
  Sky: ownLogo('Sky', '0 0 64 64', skyLogoPaths),
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
