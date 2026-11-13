// The Gleam grammar of highlight.js, from the gleam-lang organisation,
// ships without types: it is a language function like the built-in ones
declare module '@gleam-lang/highlight.js-gleam' {
  import { type LanguageFn } from 'highlight.js'

  const gleam: LanguageFn
  export default gleam
}
