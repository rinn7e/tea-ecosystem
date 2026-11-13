import { cn } from '@rinn7e/tea-cup-prelude'
import { memo } from 'react'

import { concepts } from '@/common/type/framework'
import {
  conceptLabel,
  conceptMeaning,
  gradeBadgeView,
  gradeMeaning,
  shownGrades,
  tierMeaning,
} from '@/component/framework-view'
import {
  sectionBoxClass,
  sectionGridClass,
  sectionTitleView,
} from '@/component/section-title'

import { type Props, PropsEq } from './type'

// A row of the lists of grades and concepts: the name on the left, what it
// means on the right; stacked on a phone
const rowClass =
  'border-line flex flex-col items-start gap-[6px] border-b px-[18px] py-[14px] last:border-b-0 lg:grid lg:grid-cols-[120px_1fr] lg:items-center lg:gap-[16px]'

// A tier: one cell of the box of tiers
const tierCardView = ({ title, rule }: { title: string; rule: string }) => (
  <div className='bg-panel flex flex-col items-center gap-[8px] px-[18px] py-[18px] text-center'>
    <span className='text-ink text-lg font-normal'>{title}</span>
    <span className='text-ink-muted text-sm text-balance'>{rule}</span>
  </div>
)

// Static for now: the model and the messages are empty
const RubricComponent = (_props: Props) => (
  <div className='flex flex-col gap-[32px]'>
    <section className='flex flex-col items-center gap-[12px] text-center'>
      <h1 className='text-ink text-[2rem] leading-tight font-normal text-balance lg:text-[2.625rem]'>
        What counts as TEA
      </h1>
      <p className='text-ink-muted max-w-[640px] text-base text-balance'>
        Almost every state library uses the words update and subscription. The
        rubric grades the parts that make The Elm Architecture what it is, and
        every grade needs evidence.
      </p>
    </section>

    <section className='flex flex-col gap-[14px]'>
      {sectionTitleView({ title: 'Tiers' })}
      <div className={cn(sectionBoxClass, sectionGridClass, 'lg:grid-cols-3')}>
        {tierCardView({
          title: 'Originator',
          rule: tierMeaning('reference'),
        })}
        {tierCardView({
          title: 'Full TEA',
          rule: tierMeaning('full'),
        })}
        {tierCardView({
          title: 'Superset',
          rule: tierMeaning('superset'),
        })}
      </div>
      <p className='text-ink-muted text-center text-sm'>
        A library that fails a hard requirement goes to the TEA-adjacent page,
        with the reason.
      </p>
    </section>

    <section className='flex flex-col gap-[14px]'>
      {sectionTitleView({ title: 'Grades' })}
      {/* One list, in the rows of the concepts below: the badge, then what
          it means */}
      <div className={cn(sectionBoxClass, 'bg-panel')}>
        {shownGrades.map((grade) => (
          <div key={grade} className={rowClass}>
            <span className='flex'>{gradeBadgeView({ grade })}</span>
            <span className='text-ink-muted text-sm'>
              {gradeMeaning(grade)}
            </span>
          </div>
        ))}
      </div>
    </section>

    <section className='flex flex-col gap-[14px]'>
      {sectionTitleView({ title: 'Concepts' })}
      <div className={cn(sectionBoxClass, 'bg-panel')}>
        {concepts.map((concept) => (
          <div key={concept} className={rowClass}>
            <span className='text-ink text-sm font-normal'>
              {conceptLabel(concept)}
            </span>
            <span className='text-ink-muted text-sm'>
              {conceptMeaning(concept)}
            </span>
          </div>
        ))}
      </div>
      <p className='text-ink-muted text-center text-sm'>
        The line that matters most is Cmd: update returns effects as values and
        never runs them. That is what keeps Redux out.
      </p>
    </section>
  </div>
)

export const RubricMemo = memo(RubricComponent, PropsEq.equals)
