import { cn } from '@rinn7e/tea-cup-prelude'
import {
  IconBrowser,
  IconCalendarPlus,
  IconCode,
  IconDeviceDesktop,
  IconDeviceGamepad2,
  IconDeviceMobile,
  IconGitCommit,
  IconServer,
  IconServerBolt,
  IconSparkles,
  IconStarFilled,
  IconTerminal2,
} from '@tabler/icons-react'

import {
  type Concept,
  type Framework,
  type Grade,
  type Status,
  type Target,
  type Tier,
  addedDayOf,
  concepts,
  isLanguageEntry,
  isRecentlyAdded,
  sourceUrlOf,
} from '@/common/type/framework'
import { dayMonthYearOf, monthYearOf } from '@/common/util/date'
import { starCountOf } from '@/common/util/number'

import { type Content } from './tooltip'
import { TooltipTrigger } from './tooltip/trigger'

export const conceptLabel = (concept: Concept): string => {
  switch (concept) {
    case 'model':
      return 'Model'
    case 'msg':
      return 'Msg'
    case 'update':
      return 'Update'
    case 'view':
      return 'View'
    case 'cmd':
      return 'Cmd'
    case 'sub':
      return 'Sub'
    case 'ports':
      return 'Ports'
  }
}

export const conceptMeaning = (concept: Concept): string => {
  switch (concept) {
    case 'model':
      return 'One immutable value holds the state of the program (or of a component).'
    case 'msg':
      return 'A closed set of messages describes everything that can happen.'
    case 'update':
      return 'A pure function from a message and the model to the next model and the effects to run.'
    case 'view':
      return 'A pure function of the model draws the screen. A headless loop leaves this to any view layer.'
    case 'cmd':
      return 'Effects are values handed to the runtime, and their results come back as messages.'
    case 'sub':
      return 'Outside events (time, sockets, keys) are declared from the model, and the runtime starts and stops them.'
    case 'ports':
      return 'A way to talk to the host platform: JavaScript, the OS, deep links. Recorded, never required.'
  }
}

// An optional part (Ports) that is not there shows as `none` (grey) rather
// than `missing` (red): its absence keeps no entry out of TEA
export type ShownGrade = Grade | 'none'

export const shownGrades: readonly ShownGrade[] = [
  'native',
  'managed',
  'equivalent',
  'missing',
  'none',
]

export const optionalConcepts: readonly Concept[] = ['ports']

export const shownGradeOf = (concept: Concept, grade: Grade): ShownGrade =>
  grade === 'missing' && optionalConcepts.includes(concept) ? 'none' : grade

export const gradeLabel = (grade: ShownGrade): string => {
  switch (grade) {
    case 'native':
      return 'Native'
    case 'managed':
      return 'Managed'
    case 'equivalent':
      return 'Equivalent'
    case 'missing':
      return 'Missing'
    case 'none':
      return 'None'
  }
}

export const gradeMeaning = (grade: ShownGrade): string => {
  switch (grade) {
    case 'native':
      return 'In the shape of TEA, as in Elm.'
    case 'managed':
      return 'A long-running source the runtime manages, without a declarative function of the model.'
    case 'equivalent':
      return 'The same power in another shape, such as effects run inside update. It describes a part and never qualifies an entry for a tier.'
    case 'missing':
      return 'Not there, and the rubric needs it.'
    case 'none':
      return 'Not there, and never required (Ports).'
  }
}

// The border is apart from the fill (background and text), so a chosen
// filter box can swap the border for the blue edge and keep the colors a
// card shows
export type Tone = { border: string; fill: string }

const toneClass = (tone: Tone): string => `${tone.border} ${tone.fill}`

export const gradeTone = (grade: ShownGrade): Tone => {
  switch (grade) {
    case 'native':
      return { border: 'border-native/40', fill: 'bg-native/10 text-native' }
    case 'managed':
      return { border: 'border-managed/40', fill: 'bg-managed/10 text-managed' }
    case 'equivalent':
      return {
        border: 'border-equivalent/40',
        fill: 'bg-equivalent/10 text-equivalent',
      }
    case 'missing':
      return { border: 'border-missing/40', fill: 'bg-missing/10 text-missing' }
    case 'none':
      return { border: 'border-line', fill: 'bg-field text-ink-faint' }
  }
}

const gradeClass = (grade: ShownGrade): string => toneClass(gradeTone(grade))

// Every tier wears the one plain tone of Full TEA: the label says the tier
export const tierTone: Tone = {
  border: 'border-line',
  fill: 'bg-panel text-ink-muted',
}

export const targetTone: Tone = {
  border: 'border-line',
  fill: 'bg-field text-ink-muted',
}

export const languageLineOf = (framework: Framework): string =>
  isLanguageEntry(framework)
    ? 'Language'
    : framework.tier === 'adjacent'
      ? `${framework.language} library`
      : `${framework.language} framework`

export const tierLabel = (tier: Tier): string => {
  switch (tier) {
    case 'reference':
      return 'Originator'
    case 'full':
      return 'Full TEA'
    case 'superset':
      return 'Superset'
    case 'adjacent':
      return 'TEA-adjacent'
  }
}

export const tierMeaning = (tier: Tier): string => {
  switch (tier) {
    case 'reference':
      return 'Elm itself, where the architecture comes from: every other entry is graded against it.'
    case 'full':
      return 'Model, Msg, update and Cmd native; Sub native or managed. A headless loop with no view counts.'
    case 'superset':
      return 'Full TEA plus something beyond it, named in its notes: components with a loop of their own, SSR and hydration, a server loop.'
    case 'adjacent':
      return 'Shares the words of TEA but misses a hard requirement of the rubric.'
  }
}

export const statusLabel = (status: Status): string => {
  switch (status) {
    case 'active':
      return 'Active'
    case 'quiet':
      return 'Quiet'
    case 'archived':
      return 'Archived'
  }
}

export const statusMeaning = (status: Status): string => {
  switch (status) {
    case 'active':
      return 'Still worked on: recent pushes or releases.'
    case 'quiet':
      return 'Little or no recent activity, but not archived: often finished rather than dead.'
    case 'archived':
      return 'Its repository is archived, or its author has moved on.'
  }
}

export const targetLabel = (target: Target): string => {
  switch (target) {
    case 'web':
      return 'Web'
    case 'ssr':
      return 'SSR'
    case 'server':
      return 'Server'
    case 'desktop':
      return 'Desktop'
    case 'mobile':
      return 'Mobile'
    case 'tui':
      return 'Terminal'
    case 'game':
      return 'Games'
  }
}

export const targetMeaning = (target: Target): string => {
  switch (target) {
    case 'web':
      return 'Runs in the browser.'
    case 'ssr':
      return 'Renders on the server, then runs on in the browser.'
    case 'server':
      return 'Runs its loop on a server.'
    case 'desktop':
      return 'Builds native desktop apps.'
    case 'mobile':
      return 'Builds iOS or Android apps.'
    case 'tui':
      return 'Builds apps for the terminal.'
    case 'game':
      return 'Builds games.'
  }
}

export const gradeBadgeView = ({ grade }: { grade: ShownGrade }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-[2px] border px-[8px] py-[2px] text-xs font-normal',
      gradeClass(grade),
    )}
  >
    {gradeLabel(grade)}
  </span>
)

export const tierBadgeView = ({ tier }: { tier: Tier }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-[2px] border px-[10px] py-[2px] text-xs font-normal whitespace-nowrap',
      toneClass(tierTone),
    )}
  >
    {tierLabel(tier)}
  </span>
)

// On the accent fill of a chosen option (`isOnAccent`) the dot takes the
// colors made for it, so it stands out from the blue
export const statusDotView = ({
  status,
  isOnAccent = false,
}: {
  status: Status
  isOnAccent?: boolean
}) => (
  <span
    aria-hidden='true'
    className={cn(
      'size-[8px] shrink-0 rounded-full',
      isOnAccent
        ? status === 'active'
          ? 'bg-native-on-accent'
          : status === 'quiet'
            ? 'bg-equivalent-on-accent'
            : 'bg-missing-on-accent'
        : status === 'active'
          ? 'bg-native'
          : status === 'quiet'
            ? 'bg-equivalent'
            : 'bg-missing',
    )}
  />
)

export const statusView = ({ status }: { status: Status }) => (
  <span
    className={cn(
      'inline-flex items-center gap-[6px] text-xs',
      status === 'archived' ? 'text-missing' : 'text-ink-muted',
    )}
  >
    {statusDotView({ status })}
    {statusLabel(status)}
  </span>
)

// Each part is as wide as its label, so a long one (Update) never clips.
// Inside a link (`isInLink`, the strip of a card), a tap on a touch screen
// follows the link instead of opening the tooltip.
export const rubricStripView = ({
  id,
  rubric,
  isInLink = false,
}: {
  id: string
  rubric: Record<Concept, Grade>
  isInLink?: boolean
}) => (
  <div className='flex gap-[3px]'>
    {concepts.map((concept) => (
      <TooltipTrigger
        key={concept}
        id={`${id}-${concept}`}
        content={gradeTooltipOf(concept, rubric[concept])}
        label={`${conceptLabel(concept)}: ${gradeLabel(shownGradeOf(concept, rubric[concept]))}`}
        touch={!isInLink}
        className={cn(
          'flex h-[26px] flex-auto items-center justify-center rounded-[2px] border px-[4px] text-[0.6875rem] font-normal',
          isInLink ? 'cursor-pointer' : 'cursor-default',
          gradeClass(shownGradeOf(concept, rubric[concept])),
        )}
      >
        {conceptLabel(concept)}
      </TooltipTrigger>
    ))}
  </div>
)

// The legend of all five grades is in this tooltip, where it used to be on
// the page
const gradeTooltipOf = (concept: Concept, grade: Grade): Content => ({
  title: `${conceptLabel(concept)}: ${gradeLabel(shownGradeOf(concept, grade))}`,
  text: conceptMeaning(concept),
  legend: shownGrades.map((shown) => ({
    label: gradeLabel(shown),
    text: gradeMeaning(shown),
    badgeClassName: gradeClass(shown),
    isCurrent: shown === shownGradeOf(concept, grade),
  })),
})

export const targetIconView = ({ target }: { target: Target }) => {
  const props = { size: 14, stroke: 1.75, 'aria-hidden': true } as const
  switch (target) {
    case 'web':
      return <IconBrowser {...props} />
    case 'ssr':
      return <IconServerBolt {...props} />
    case 'server':
      return <IconServer {...props} />
    case 'desktop':
      return <IconDeviceDesktop {...props} />
    case 'mobile':
      return <IconDeviceMobile {...props} />
    case 'tui':
      return <IconTerminal2 {...props} />
    case 'game':
      return <IconDeviceGamepad2 {...props} />
  }
}

// Chips are easier to scan than a list of words. Square corners, as every
// chip of the style guide.
export const targetChipsView = ({
  targets,
  align,
}: {
  targets: Target[]
  align: 'start' | 'center'
}) => (
  <div
    className={cn(
      'flex flex-wrap gap-[6px]',
      align === 'center' ? 'justify-center' : 'justify-start',
    )}
  >
    {targets.map((target) => targetChipView({ target }))}
  </div>
)

export const targetChipView = ({ target }: { target: Target }) => (
  <span
    key={target}
    className={cn(
      'inline-flex items-center gap-[4px] rounded-[2px] border px-[7px] py-[2px] text-xs',
      toneClass(targetTone),
    )}
  >
    {targetIconView({ target })}
    {targetLabel(target)}
  </span>
)

export const starsView = ({ stars }: { stars: number | undefined }) =>
  stars === undefined ? null : (
    <span
      className='text-star-ink inline-flex shrink-0 items-center gap-[4px] tabular-nums'
      title={`${stars} stars`}
    >
      <IconStarFilled size={14} className='text-star' aria-hidden />
      {starCountOf(stars)}
    </span>
  )

// The ribbon of an entry found after the first list (`isRecentlyAdded`)
// on the right edge of a card, under its tier badge: the left end
// notched, the right end past the edge of the card and folded behind it (a
// small darker triangle under it). It takes no presses, so a press on it
// reaches the card under it.
export const recentEdgeRibbonView = () => (
  <span className='after:border-t-ribbon-fold pointer-events-none absolute top-[52px] -right-[6px] z-20 flex after:absolute after:top-full after:right-0 after:border-t-[6px] after:border-r-[6px] after:border-r-transparent'>
    <span className='bg-accent text-accent-ink py-[2px] pr-[12px] pl-[16px] text-[0.6875rem] leading-[1.45] whitespace-nowrap [clip-path:polygon(0_0,100%_0,100%_100%,0_100%,8px_50%)]'>
      Recently added
    </span>
  </span>
)

// Drawn like the star button of GitHub. On a card it sits above the link
// that covers the card (`relative z-10`).
export const sourceLinkView = ({ framework }: { framework: Framework }) => (
  <a
    href={sourceUrlOf(framework)}
    target='_blank'
    rel='noreferrer'
    title={`Open the source: ${sourceUrlOf(framework).replace(/^https:\/\//, '')}`}
    aria-label={`Open the source of ${framework.name}${framework.stars === undefined ? '' : `, ${framework.stars} stars`}`}
    className='border-line hover:border-edge relative z-10 inline-flex h-[24px] shrink-0 items-stretch rounded-[2px] border text-xs transition-colors'
  >
    {framework.stars !== undefined && (
      <span className='border-line flex items-center border-r px-[7px]'>
        {starsView({ stars: framework.stars })}
      </span>
    )}
    <span className='text-ink-muted flex w-[24px] items-center justify-center'>
      <IconCode size={15} stroke={1.75} aria-hidden />
    </span>
  </a>
)

type DateField = 'created' | 'updated' | 'added'

// The repository dates show their month, the day an entry was added shows
// the day, since it is recent
const dateTextOf = (which: DateField, day: string) => {
  switch (which) {
    case 'created':
      return {
        shown: monthYearOf(day),
        title: `Created ${monthYearOf(day)}`,
        text: 'The month its repository was created.',
      }
    case 'updated':
      return {
        shown: monthYearOf(day),
        title: `Updated ${monthYearOf(day)}`,
        text: 'The month of the last push to its repository.',
      }
    case 'added':
      return {
        shown: dayMonthYearOf(day),
        title: `Added ${dayMonthYearOf(day)}`,
        text: 'The day it was added to this catalog.',
      }
  }
}

const dateIconView = ({ which }: { which: DateField }) => {
  switch (which) {
    case 'created':
      return <IconCalendarPlus size={14} stroke={1.75} aria-hidden />
    case 'updated':
      return <IconGitCommit size={14} stroke={1.75} aria-hidden />
    case 'added':
      return <IconSparkles size={14} stroke={1.75} aria-hidden />
  }
}

export const dateView = ({
  id,
  which,
  day,
}: {
  id: string
  which: DateField
  day: string
}) => {
  const words = dateTextOf(which, day)
  return (
    <TooltipTrigger
      id={`${id}-${which}`}
      content={{ title: words.title, text: words.text }}
      label={words.title}
      className='inline-flex cursor-default items-center gap-[4px] whitespace-nowrap tabular-nums'
    >
      {dateIconView({ which })}
      {words.shown}
    </TooltipTrigger>
  )
}

export const addedView = ({
  framework,
  recentSince,
}: {
  framework: Framework
  recentSince: string
}) => {
  const words = dateTextOf('added', addedDayOf(framework))
  return isRecentlyAdded(framework, recentSince) ? (
    <TooltipTrigger
      id={`${framework.id}-added`}
      content={{ title: words.title, text: words.text }}
      label={`Recently added, ${words.shown}`}
      className='bg-accent text-accent-ink inline-flex cursor-default px-[14px] py-[2px] text-xs whitespace-nowrap tabular-nums [clip-path:polygon(0_0,100%_0,calc(100%-6px)_50%,100%_100%,0_100%,6px_50%)]'
    >
      Recently added · {words.shown}
    </TooltipTrigger>
  ) : (
    dateView({ id: framework.id, which: 'added', day: addedDayOf(framework) })
  )
}
