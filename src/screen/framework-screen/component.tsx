import { IconArrowLeft, IconExternalLink, IconWorld } from '@tabler/icons-react'
import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { memo } from 'react'

import { entriesOf, listOf } from '@/common/data/catalog'
import { snippetOf } from '@/common/data/snippet'
import { destinationOfScreen, frameworkScreen } from '@/common/type/destination'
import {
  type Framework,
  concepts,
  hostOf,
  isRecentlyAdded,
  sourceLabelOf,
  sourceUrlOf,
  websiteLabelOf,
  websiteOf,
} from '@/common/type/framework'
import { codeBlockView } from '@/component/code-block'
import {
  conceptLabel,
  conceptMeaning,
  dateView,
  gradeBadgeView,
  gradeMeaning,
  kindLineOf,
  recentRibbonView,
  shownGradeOf,
  sourceLinkView,
  statusView,
  targetChipsView,
  tierBadgeView,
} from '@/component/framework-view'
import { Link } from '@/component/link'
import { frameworkTileView, languageLineLogoView } from '@/component/logo'
import { sectionTitleView } from '@/component/section-title'

import { type Props, PropsEq } from './type'

// Where an example comes from, short: the site and the project (the first
// two parts of the path), then the file (`github.com/lustre-labs/lustre ·
// README.md`)
const exampleSourceLabelOf = (url: string): string => {
  const parts = new URL(url).pathname.split('/').filter((part) => part !== '')
  const project = [hostOf(url), ...parts.slice(0, 2)].join('/')
  return parts.length > 2 ? `${project} · ${parts[parts.length - 1]}` : project
}

// Its example, as its own docs write it, highlighted: the language on the
// left, where it was copied from on the right. Nothing for an entry with no
// example.
const exampleView = ({ framework }: { framework: Framework }) =>
  pipe(
    snippetOf(framework.id),
    O.fold(
      () => null,
      (snippet) => (
        <section className='flex flex-col gap-[14px]'>
          {sectionTitleView({ title: 'Example' })}
          <div className='flex flex-col gap-[6px]'>
            <div className='text-ink-muted flex flex-wrap items-center justify-between gap-[8px] text-xs'>
              <span className='flex items-center gap-[6px]'>
                {languageLineLogoView({ framework, size: 'small' })}
                {framework.language}
              </span>
              {framework.snippetSource !== undefined && (
                <a
                  href={framework.snippetSource}
                  target='_blank'
                  rel='noreferrer'
                  className='hover:text-accent inline-flex min-w-0 items-center gap-[4px]'
                >
                  <span className='truncate'>
                    From {exampleSourceLabelOf(framework.snippetSource)}
                  </span>
                  <IconExternalLink size={13} stroke={1.75} aria-hidden />
                </a>
              )}
            </div>
            {codeBlockView({ html: snippet.html })}
          </div>
        </section>
      ),
    ),
  )

const rubricView = ({ framework }: { framework: Framework }) => (
  <div className='border-line bg-panel offset-shadow overflow-hidden rounded-[3px] border'>
    {concepts.map((concept) => (
      <div
        key={concept}
        className='border-line grid grid-cols-[1fr_auto] items-center gap-[12px] border-b px-[16px] py-[12px] last:border-b-0 lg:grid-cols-[120px_1fr_auto]'
      >
        <span className='text-ink text-sm font-normal'>
          {conceptLabel(concept)}
        </span>
        <span className='text-ink-muted order-last col-span-2 text-sm lg:order-none lg:col-span-1'>
          {conceptMeaning(concept)}
        </span>
        <span
          className='justify-self-end'
          title={gradeMeaning(shownGradeOf(concept, framework.rubric[concept]))}
        >
          {gradeBadgeView({
            grade: shownGradeOf(concept, framework.rubric[concept]),
          })}
        </span>
      </div>
    ))}
  </div>
)

const relatedView = ({ framework }: { framework: Framework }) => {
  const related = pipe(
    entriesOf(listOf(framework)),
    A.filter((f) => f.language === framework.language && f.id !== framework.id),
  )
  return related.length === 0 ? null : (
    <section className='flex flex-col gap-[14px]'>
      {sectionTitleView({ title: `More in ${framework.language}` })}
      <div className='flex flex-wrap justify-center gap-[8px]'>
        {related.map((f) => (
          <Link
            key={f.id}
            destination={destinationOfScreen(frameworkScreen(f.id))}
            className='border-line bg-panel text-ink hover:border-edge hover:text-accent flex items-center gap-[8px] rounded-[2px] border py-[5px] pr-[12px] pl-[5px] text-sm transition-colors'
          >
            {frameworkTileView({ framework: f, size: 'chip' })}
            {f.name}
            {languageLineLogoView({ framework: f, size: 'small' })}
          </Link>
        ))}
      </div>
    </section>
  )
}

const FrameworkComponent = ({ model, listDestination, recentSince }: Props) => {
  const { framework } = model
  return (
    <article className='flex flex-col gap-[28px]'>
      {/* Back on the left, the source of the project on the right: the
          same place as its star button */}
      <div className='flex items-center justify-between gap-[12px]'>
        <Link
          destination={listDestination}
          back
          className='text-ink-muted hover:text-accent inline-flex items-center gap-[6px] text-sm'
        >
          <IconArrowLeft size={16} stroke={1.75} />
          {listOf(framework) === 'catalog'
            ? 'All frameworks'
            : 'All TEA-adjacent'}
        </Link>
        <a
          href={sourceUrlOf(framework)}
          target='_blank'
          rel='noreferrer'
          className='text-ink-muted hover:text-accent inline-flex min-w-0 items-center gap-[6px] text-sm'
        >
          <span className='truncate'>{sourceLabelOf(framework)}</span>
          <IconExternalLink size={16} stroke={1.75} className='shrink-0' />
        </a>
      </div>

      <header className='flex flex-col items-center gap-[12px] text-center'>
        {frameworkTileView({ framework, size: 'page' })}
        <span className='text-accent flex items-center gap-[8px] text-base font-normal'>
          {languageLineLogoView({ framework, size: 'large' })}
          {kindLineOf(framework)}
        </span>
        <h1 className='text-ink text-[2rem] leading-tight font-normal text-balance lg:text-[2.625rem]'>
          {framework.name}
        </h1>
        <p className='text-ink-muted max-w-[620px] text-base text-balance'>
          {framework.summary}
        </p>
        {/* Its website or docs, when they are not its source */}
        {pipe(
          O.fromNullable(websiteOf(framework)),
          O.fold(
            () => null,
            (website) => (
              <a
                href={website}
                target='_blank'
                rel='noreferrer'
                className='text-accent inline-flex items-center gap-[6px] text-sm hover:underline'
              >
                <IconWorld size={16} stroke={1.75} aria-hidden />
                {websiteLabelOf(website)}
              </a>
            ),
          ),
        )}
        <div className='flex flex-wrap items-center justify-center gap-[12px]'>
          {tierBadgeView({ tier: framework.tier })}
          {statusView({ status: framework.status })}
        </div>
        {isRecentlyAdded(framework, recentSince) && recentRibbonView()}
        {targetChipsView({ targets: framework.targets, align: 'center' })}
        {/* Created on one side of the axis, updated on the other, and on
            it the stars and the code button, one link to the source */}
        {framework.createdAt !== undefined &&
          framework.updatedAt !== undefined && (
            <div className='text-ink-faint grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-[12px] text-sm'>
              <span className='flex justify-end'>
                {dateView({
                  id: framework.id,
                  which: 'created',
                  day: framework.createdAt,
                })}
              </span>
              <span className='bg-line h-[14px] w-px' />
              {sourceLinkView({ framework })}
              <span className='bg-line h-[14px] w-px' />
              <span className='flex justify-start'>
                {dateView({
                  id: framework.id,
                  which: 'updated',
                  day: framework.updatedAt,
                })}
              </span>
            </div>
          )}
        {/* The day it joined this catalog, on the axis under its dates */}
        <span className='text-ink-faint text-sm'>
          {dateView({
            id: framework.id,
            which: 'added',
            day: framework.discoveredAt,
          })}
        </span>
      </header>

      {exampleView({ framework })}

      <section className='flex flex-col gap-[14px]'>
        {sectionTitleView({ title: 'Rubric' })}
        {rubricView({ framework })}
        {/* Where these grades come from */}
        {framework.verified ? (
          <p className='text-native text-center text-sm'>
            Every grade is checked against its docs or source.
          </p>
        ) : (
          <p className='text-ink-faint text-center text-sm'>
            Not yet checked against its docs or source. Corrections are welcome.
          </p>
        )}
      </section>

      {framework.notes.length > 0 && (
        <section className='flex flex-col gap-[14px]'>
          {sectionTitleView({ title: 'Notes' })}
          <ul className='border-line bg-panel offset-shadow flex flex-col gap-[8px] rounded-[3px] border px-[20px] py-[16px]'>
            {framework.notes.map((note) => (
              <li
                key={note}
                className='text-ink-muted list-inside list-disc text-sm'
              >
                {note}
              </li>
            ))}
          </ul>
        </section>
      )}

      {relatedView({ framework })}
    </article>
  )
}

export const FrameworkMemo = memo(FrameworkComponent, PropsEq.equals)
