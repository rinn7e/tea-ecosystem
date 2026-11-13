import { cn } from '@rinn7e/tea-cup-prelude'
import { IconExternalLink } from '@tabler/icons-react'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { memo } from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { type BuildLanguage, buildLanguages } from '@/common/type/destination'
import { codeBlockView } from '@/component/code-block'
import { sectionTitleView } from '@/component/section-title'

import { type Step, highlightedSnippetOf, languageLabel, steps } from './step'
import { type Msg, type Props, PropsEq } from './type'

const REALWORLD =
  'https://github.com/rinn7e/realworld-fullstack-react-tea-cup-haskell/tree/master/package'

const sourceOf = (language: BuildLanguage): O.Option<string> => {
  switch (language) {
    case 'swift':
      return O.some(`${REALWORLD}/mobile-admin-ios/src/Package/TeaCup`)
    case 'kotlin':
      return O.some(
        `${REALWORLD}/mobile-admin-android/app/src/main/kotlin/teacup`,
      )
    case 'typescript':
      return O.none
  }
}

// Swift on the left, Kotlin on the right, TypeScript on the axis
const languageTabsView = ({
  language,
  dispatch,
}: {
  language: BuildLanguage
  dispatch: Dispatcher<Msg>
}) => (
  <div
    role='tablist'
    aria-label='Language'
    className='flex flex-wrap justify-center gap-[12px]'
  >
    {buildLanguages.map((l) => (
      <button
        key={l}
        type='button'
        role='tab'
        aria-selected={l === language}
        onClick={() => dispatch({ _tag: 'ChangeLanguage', language: l })}
        className={cn(
          'h-[40px] border-2 px-[18px] text-base transition-shadow',
          l === language
            ? 'border-accent bg-accent text-accent-ink'
            : 'border-edge bg-panel text-accent hover:offset-shadow-edge',
        )}
      >
        {languageLabel(l)}
      </button>
    ))}
  </div>
)

const sourceNoteView = ({ language }: { language: BuildLanguage }) =>
  pipe(
    sourceOf(language),
    O.fold(
      () => (
        <p className='text-ink-muted max-w-[620px] text-center text-sm text-balance'>
          A minimal runtime written for this guide. For production,{' '}
          <a
            href='https://github.com/vankeisb/react-tea-cup'
            target='_blank'
            rel='noreferrer'
            className='text-accent hover:underline'
          >
            react-tea-cup
          </a>{' '}
          is the same idea, done with more care.
        </p>
      ),
      (url) => (
        <p className='text-ink-muted max-w-[620px] text-center text-sm text-balance'>
          Taken from a real app: the {language === 'swift' ? 'iOS' : 'Android'}{' '}
          admin of the realworld example runs on this runtime, about 150 lines
          with no dependency.{' '}
          <a
            href={url}
            target='_blank'
            rel='noreferrer'
            className='text-accent inline-flex items-center gap-[4px] hover:underline'
          >
            Read the source
            <IconExternalLink size={14} stroke={1.75} />
          </a>
        </p>
      ),
    ),
  )

const stepView = ({
  step,
  language,
}: {
  step: Step
  language: BuildLanguage
}) => (
  <section key={step.id} className='flex flex-col gap-[14px]'>
    <div className='flex flex-col items-center gap-[8px] text-center'>
      <span className='border-accent/60 text-accent flex size-[32px] items-center justify-center rounded-full border text-sm font-normal'>
        {step.number}
      </span>
      <h2 className='text-ink text-xl font-normal text-balance'>
        {step.title}
      </h2>
    </div>
    <p className='text-ink-muted text-base'>{step.body}</p>
    {pipe(
      highlightedSnippetOf(step, language),
      O.fold(
        () => null,
        (html) => codeBlockView({ html }),
      ),
    )}
  </section>
)

const BuildComponent = ({ model, dispatch }: Props) => (
  <div className='flex justify-center'>
    <div className='flex w-full max-w-[820px] flex-col gap-[36px]'>
      <section className='flex flex-col items-center gap-[14px] text-center'>
        <h1 className='text-ink text-[2rem] leading-tight font-normal text-balance lg:text-[2.625rem]'>
          Build your own TEA
        </h1>
        <p className='text-ink-muted max-w-[640px] text-base text-balance'>
          A TEA runtime is small enough to write in an afternoon. Eight steps,
          the same in every language: no framework is needed to have The Elm
          Architecture on a platform that has none.
        </p>
        {languageTabsView({ language: model.language, dispatch })}
        {sourceNoteView({ language: model.language })}
      </section>
      {sectionTitleView({ title: 'Eight steps' })}
      {steps.map((step) => stepView({ step, language: model.language }))}
    </div>
  </div>
)

export const BuildMemo = memo(BuildComponent, PropsEq.equals)
