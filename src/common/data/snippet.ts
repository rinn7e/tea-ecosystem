import gleam from '@gleam-lang/highlight.js-gleam'
import * as O from 'fp-ts/Option'
import * as R from 'fp-ts/Record'
import { pipe } from 'fp-ts/function'
import hljs from 'highlight.js/lib/core'
import clojure from 'highlight.js/lib/languages/clojure'
import csharp from 'highlight.js/lib/languages/csharp'
import dart from 'highlight.js/lib/languages/dart'
import elixir from 'highlight.js/lib/languages/elixir'
import elm from 'highlight.js/lib/languages/elm'
import fsharp from 'highlight.js/lib/languages/fsharp'
import go from 'highlight.js/lib/languages/go'
import haskell from 'highlight.js/lib/languages/haskell'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import kotlin from 'highlight.js/lib/languages/kotlin'
import ocaml from 'highlight.js/lib/languages/ocaml'
import powershell from 'highlight.js/lib/languages/powershell'
import python from 'highlight.js/lib/languages/python'
import reasonml from 'highlight.js/lib/languages/reasonml'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import scala from 'highlight.js/lib/languages/scala'
import swift from 'highlight.js/lib/languages/swift'
import typescript from 'highlight.js/lib/languages/typescript'

// The grammars the examples need. Some languages have none in highlight.js
// and read well in the grammar of a close relative: PureScript, Lean and
// Monad as Haskell, Roc and Sky as Elm, Odin as Go, Zig as Rust.
const grammars = {
  clojure,
  csharp,
  dart,
  elixir,
  elm,
  fsharp,
  gleam,
  go,
  haskell,
  java,
  javascript,
  kotlin,
  ocaml,
  powershell,
  python,
  reasonml,
  ruby,
  rust,
  scala,
  swift,
  typescript,
}

Object.entries(grammars).forEach(([name, grammar]) => {
  hljs.registerLanguage(name, grammar)
})

const grammarOfExtension: Record<string, keyof typeof grammars> = {
  cljs: 'clojure',
  cs: 'csharp',
  dart: 'dart',
  elm: 'elm',
  ex: 'elixir',
  fs: 'fsharp',
  gleam: 'gleam',
  go: 'go',
  hs: 'haskell',
  java: 'java',
  js: 'javascript',
  jsx: 'javascript',
  kt: 'kotlin',
  lean: 'haskell',
  mo: 'haskell',
  ml: 'ocaml',
  odin: 'go',
  ps1: 'powershell',
  purs: 'haskell',
  py: 'python',
  rb: 'ruby',
  re: 'reasonml',
  roc: 'elm',
  rs: 'rust',
  scala: 'scala',
  sky: 'elm',
  swift: 'swift',
  ts: 'typescript',
  tsx: 'typescript',
  zig: 'rust',
}

// Copied from the docs of the entry itself (`snippetSource` of the data
// files says where)
export type Snippet = {
  code: string
  html: string
}

// One file per entry: `data/snippet/<id>.<extension>`. Plain text, so the
// examples keep their own formatting and are not compiled with this app.
const snippetFiles: Record<string, string> = import.meta.glob<string>(
  '../../../data/snippet/*',
  { query: '?raw', import: 'default', eager: true },
)

const fileNameOf = (path: string): string => path.split('/').pop() ?? path

const splitFileName = (fileName: string): { id: string; extension: string } => {
  const dot = fileName.lastIndexOf('.')
  return { id: fileName.slice(0, dot), extension: fileName.slice(dot + 1) }
}

export const snippetFileNames: string[] =
  Object.keys(snippetFiles).map(fileNameOf)

export const isKnownSnippetExtension = (fileName: string): boolean =>
  splitFileName(fileName).extension in grammarOfExtension

const snippets: Record<string, Snippet> = Object.fromEntries(
  Object.entries(snippetFiles).map(([path, code]) => {
    const { id, extension } = splitFileName(fileNameOf(path))
    const trimmed = code.trimEnd()
    return [
      id,
      {
        code: trimmed,
        html: pipe(
          grammarOfExtension,
          R.lookup(extension),
          O.fold(
            () => hljs.highlightAuto(trimmed).value,
            (language) => hljs.highlight(trimmed, { language }).value,
          ),
        ),
      },
    ]
  }),
)

export const snippetOf = (id: string): O.Option<Snippet> =>
  pipe(snippets, R.lookup(id))
