import * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import * as R from 'fp-ts/Record'
import { pipe } from 'fp-ts/function'
import hljs from 'highlight.js/lib/core'
import kotlin from 'highlight.js/lib/languages/kotlin'
import swift from 'highlight.js/lib/languages/swift'
import typescript from 'highlight.js/lib/languages/typescript'

import { type BuildLanguage, buildLanguages } from '@/common/type/destination'

hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('swift', swift)
hljs.registerLanguage('typescript', typescript)

// One file per step and language: `snippet/<number>-<id>.<language>.txt`.
// Plain text, so the samples keep their own formatting and are not compiled
// with this app.
const snippetFiles: Record<string, string> = import.meta.glob<string>(
  './snippet/*.txt',
  { query: '?raw', import: 'default', eager: true },
)

export type Step = {
  number: number
  id: string
  title: string
  body: string
}

export const steps: Step[] = [
  {
    number: 1,
    id: 'model',
    title: 'Model and Msg',
    body: 'Start with two types: the state of the program, and everything that can happen to it. A closed union of messages lets update handle every case, and lets the compiler say when one is missing.',
  },
  {
    number: 2,
    id: 'update',
    title: 'update returns the work, it does not do it',
    body: 'update takes a message and the model, and returns the next model with the commands to run. A request is returned as a value, never sent from here. This one rule is what makes a TEA program testable without mocks.',
  },
  {
    number: 3,
    id: 'cmd',
    title: 'Cmd: effects as values',
    body: 'A command is a list of effects, each a function that gets a dispatcher. The runtime runs them after the step, and their results come back as messages. map lets a parent wrap the commands of a child; batch joins several.',
  },
  {
    number: 4,
    id: 'dispatcher',
    title: 'The dispatcher',
    body: 'The dispatcher is how a view or an effect sends a message. map gives a child component a dispatcher that wraps its messages into those of its parent. In Swift and Kotlin every dispatcher equals every other, so a memoized view still skips when only its dispatcher is new.',
  },
  {
    number: 5,
    id: 'runtime',
    title: 'The runtime is the loop',
    body: 'The runtime is the only stateful piece. Its dispatch is the whole architecture: call update, keep the new model, run the commands. Commands start after the step, so update always finishes before any effect begins.',
  },
  {
    number: 6,
    id: 'view',
    title: 'Draw the model',
    body: 'Connect the runtime to the view layer of the platform: an observable object in SwiftUI, Compose state on Android, an external store in React. The view reads the model and gets the dispatcher, nothing else.',
  },
  {
    number: 7,
    id: 'sub',
    title: 'Subscriptions',
    body: 'Subscriptions are a function of the model. After every step the runtime asks for them again, starts the ones with a new key and cancels the ones that are gone. The Swift and Kotlin runtimes this guide comes from stop at Cmd; this step is a sketch that adds Sub to them.',
  },
  {
    number: 8,
    id: 'ports',
    title: 'Ports to the outside world',
    body: 'The host talks to the program in two directions. Coming in, a value from outside (a deep link, a hash change) becomes a message. Going out, it is a command like any other.',
  },
]

const fileOf = (step: Step, language: BuildLanguage): string =>
  `./snippet/${step.number}-${step.id}.${language}.txt`

export const snippetOf = (
  step: Step,
  language: BuildLanguage,
): O.Option<string> => pipe(snippetFiles, R.lookup(fileOf(step, language)))

// Highlighted once, at load: the samples never change
const highlightedFiles: Record<string, string> = pipe(
  steps,
  RA.flatMap((step) =>
    pipe(
      buildLanguages,
      RA.filterMap((language) =>
        pipe(
          snippetOf(step, language),
          O.map((code): [string, string] => [
            fileOf(step, language),
            hljs.highlight(code.trimEnd(), { language }).value,
          ]),
        ),
      ),
    ),
  ),
  RA.toArray,
  R.fromEntries,
)

export const highlightedSnippetOf = (
  step: Step,
  language: BuildLanguage,
): O.Option<string> => pipe(highlightedFiles, R.lookup(fileOf(step, language)))

export const languageLabel = (language: BuildLanguage): string => {
  switch (language) {
    case 'swift':
      return 'Swift'
    case 'typescript':
      return 'TypeScript'
    case 'kotlin':
      return 'Kotlin'
  }
}
