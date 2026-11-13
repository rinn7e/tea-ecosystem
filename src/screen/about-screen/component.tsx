import { cn } from '@rinn7e/tea-cup-prelude'
import { memo } from 'react'

import {
  type Destination,
  adjacentScreen,
  buildScreen,
  catalogScreen,
  destinationOfScreen,
  rubricScreen,
} from '@/common/type/destination'
import { Link } from '@/component/link'
import {
  sectionBoxClass,
  sectionGridClass,
  sectionTitleView,
} from '@/component/section-title'

import { type Props, PropsEq } from './type'

// What the site is for: three cells of one size in one box, none featured
const purposeCardView = ({ title, text }: { title: string; text: string }) => (
  <div className='bg-panel flex flex-col items-center gap-[8px] px-[18px] py-[18px] text-center'>
    <span className='text-ink text-lg font-normal'>{title}</span>
    <span className='text-ink-muted text-sm text-balance'>{text}</span>
  </div>
)

// A page of the site, as a cell of the box of pages that opens it
const pageCardView = ({
  title,
  text,
  destination,
}: {
  title: string
  text: string
  destination: Destination
}) => (
  <Link
    destination={destination}
    className='bg-panel hover:bg-field flex flex-col gap-[6px] px-[18px] py-[16px] transition-colors'
  >
    <span className='text-accent text-lg font-normal'>{title}</span>
    <span className='text-ink-muted text-sm'>{text}</span>
  </Link>
)

// A paragraph of the page: left-aligned in a centred column
const proseView = ({ children }: { children: React.ReactNode }) => (
  <div className='flex justify-center'>
    <p className='text-ink-muted max-w-[640px] text-base'>{children}</p>
  </div>
)

// Static for now: the model and the messages are empty
const AboutComponent = (_props: Props) => (
  <div className='flex flex-col gap-[36px]'>
    <section className='flex flex-col items-center gap-[12px] text-center'>
      <h1 className='text-ink text-[2rem] leading-tight font-normal text-balance lg:text-[2.625rem]'>
        About TEA Ecosystem
      </h1>
      <p className='text-ink-muted max-w-[640px] text-base text-balance'>
        The Elm Architecture (Model, Msg, update, view, Cmd and Sub) started in
        Elm and now lives in dozens of languages. This site gathers them in one
        place and grades each one against Elm.
      </p>
    </section>

    <section className='flex flex-col gap-[14px]'>
      {sectionTitleView({ title: 'What it is for' })}
      <div className={cn(sectionBoxClass, sectionGridClass, 'lg:grid-cols-3')}>
        {purposeCardView({
          title: 'Find the real ones',
          text: 'Almost every state library says update and subscription. The catalog keeps only those that hand effects back as data.',
        })}
        {purposeCardView({
          title: 'Compare against Elm',
          text: 'Every entry is graded part by part against Elm, so you see at a glance what each one keeps, bends or leaves out.',
        })}
        {purposeCardView({
          title: 'Bring ideas back',
          text: 'Some ports grew what Elm never had: SSR, server-side TEA, typeclasses. Seeing them side by side shows what Elm could learn.',
        })}
      </div>
    </section>

    <section className='flex flex-col gap-[14px]'>
      {sectionTitleView({ title: 'The pages' })}
      <div className={cn(sectionBoxClass, sectionGridClass, 'lg:grid-cols-2')}>
        {pageCardView({
          title: 'catalog',
          text: 'Every language and framework that implements TEA, with its grades, stars and dates. The logo in the bar opens it.',
          destination: destinationOfScreen(catalogScreen()),
        })}
        {pageCardView({
          title: 'rubric',
          text: 'What counts as TEA: the parts, the grades and the tiers every entry is held to.',
          destination: destinationOfScreen(rubricScreen()),
        })}
        {pageCardView({
          title: 'TEA-adjacent',
          text: 'Redux and friends: libraries that share the words of TEA but miss a hard requirement, and which one.',
          destination: destinationOfScreen(adjacentScreen()),
        })}
        {pageCardView({
          title: 'build your own',
          text: 'A step-by-step guide to a small TEA runtime in TypeScript, Swift or Kotlin.',
          destination: destinationOfScreen(buildScreen()),
        })}
      </div>
    </section>

    <section className='flex flex-col gap-[14px]'>
      {sectionTitleView({ title: 'Where the data comes from' })}
      {proseView({
        children:
          'Each entry was read from its own README, docs and website. Some grades were first drafted from memory and a light web check; their framework page says so until they are checked against the docs. Stars, creation dates and the date of the last push come from the repository of each entry, wherever it is hosted: GitHub, GitLab, Codeberg or another Gitea.',
      })}
    </section>

    <section className='flex flex-col gap-[14px]'>
      {sectionTitleView({ title: 'Credits' })}
      {proseView({
        children:
          'Language logos come from Simple Icons (CC0) and Devicon (MIT), or from the website of their language (Roc, Lean, Sky, Gren). Each framework logo belongs to its own project. The look follows the website of Elm. Corrections are welcome.',
      })}
    </section>
  </div>
)

export const AboutMemo = memo(AboutComponent, PropsEq.equals)
