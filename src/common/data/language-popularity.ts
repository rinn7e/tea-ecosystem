// How widely each language is used, from 0 to 100: the judgement of the
// maintainer from the usual surveys and the size of each ecosystem, not a
// measured number. It orders the row of language logos; a language missing
// here counts as 0 and comes after the others, by its number of entries.
export const languagePopularity: Record<string, number> = {
  JavaScript: 100,
  Python: 98,
  Java: 92,
  C: 90,
  'C++': 89,
  'C#': 86,
  PHP: 80,
  Go: 78,
  Rust: 74,
  Kotlin: 72,
  Swift: 70,
  PowerShell: 62,
  Ruby: 60,
  Dart: 58,
  Lua: 54,
  Scala: 45,
  Elixir: 40,
  Haskell: 36,
  Erlang: 34,
  ClojureScript: 32,
  'F#': 30,
  Zig: 30,
  OCaml: 26,
  Gleam: 22,
  PureScript: 14,
  Lean: 14,
  Odin: 12,
  Roc: 10,
  Gren: 6,
  Sky: 4,
  Monad: 2,
}

// In front of the row, in this order, whatever their popularity: Elm, where
// TEA comes from, and TypeScript, the language this site is written in
export const pinnedLanguages: string[] = ['Elm', 'TypeScript']
