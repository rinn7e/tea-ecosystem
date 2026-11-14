import { cn } from '@rinn7e/tea-cup-prelude'
import {
  IconAdjustmentsHorizontal,
  IconArchive,
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconChevronDown,
  IconFilterOff,
  IconLayoutGrid,
  IconSearch,
  IconTable,
} from '@tabler/icons-react'
import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import * as S from 'fp-ts/string'
import React, { memo } from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { type ListKind, entriesOf } from '@/common/data/catalog'
import {
  type EntryKind,
  type ListingFilter,
  type ListingLayout,
  type ListingSort,
  type SortColumn,
  catalogTiers,
  defaultStatuses,
  destinationOfScreen,
  frameworkScreen,
  lackables,
} from '@/common/type/destination'
import {
  type Framework,
  isRecentlyAdded,
  statuses,
  targets,
} from '@/common/type/framework'
import {
  type Tone,
  conceptLabel,
  conceptMeaning,
  dateView,
  gradeTone,
  kindLineOf,
  recentEdgeRibbonView,
  rubricStripView,
  sourceLinkView,
  statusDotView,
  statusLabel,
  statusMeaning,
  statusView,
  targetChipsView,
  targetIconView,
  targetLabel,
  targetMeaning,
  targetTone,
  tierBadgeView,
  tierLabel,
  tierMeaning,
  tierTone,
} from '@/component/framework-view'
import { Link } from '@/component/link'
import {
  frameworkTileView,
  languageLineLogoView,
  languageLogoView,
} from '@/component/logo'
import { type Content } from '@/component/tooltip'
import { TooltipTrigger } from '@/component/tooltip/trigger'

import { PANEL_ATTRIBUTE } from './subscription'
import { type Model, type Msg, type Props, PropsEq } from './type'
import {
  type CardSort,
  balancedRows,
  cardSortLabel,
  cardSortOf,
  cardSorts,
  filterFrameworks,
  isFiltered,
  languageCountsOf,
  otherListLinkOf,
  otherListMatchTextOf,
  otherListMatchesOf,
  sortFrameworks,
  sortLabelOf,
  sortOfCardSort,
} from './util'

const entryKinds: readonly EntryKind[] = ['languages', 'frameworks']

// Stats
// ---------------------------------------------

// A count that is also a choice, like a radio button: choosing it narrows
// the list to that kind of entry, choosing it again shows every entry
const kindChoiceView = ({
  entryKind,
  count,
  filter,
  dispatch,
}: {
  entryKind: EntryKind
  count: number
  filter: ListingFilter
  dispatch: Dispatcher<Msg>
}) => {
  const isChosen = pipe(
    filter.show,
    O.exists((shown) => shown === entryKind),
  )
  return (
    <TooltipTrigger
      key={entryKind}
      id={`filter-kind-${entryKind}`}
      content={
        entryKind === 'languages'
          ? {
              title: 'Languages',
              text: 'Languages built on TEA themselves: Elm, and the languages forked from it.',
            }
          : {
              title: 'Frameworks',
              text: 'Libraries and frameworks that bring TEA to another language.',
            }
      }
      touch={false}
      className='flex'
    >
      <button
        type='button'
        aria-pressed={isChosen}
        onClick={() => dispatch({ _tag: 'ToggleShow', entryKind })}
        className={cn(
          'bg-panel flex w-full flex-col items-center justify-center gap-[2px] border-2 px-[12px] py-[10px] text-center transition-shadow',
          isChosen
            ? 'border-edge offset-shadow-edge'
            : 'border-line offset-shadow hover:border-edge',
        )}
      >
        <span
          className={cn(
            'text-[2rem] leading-none font-normal tabular-nums',
            isChosen ? 'text-accent' : 'text-ink',
          )}
        >
          {count}
        </span>
        <span className='text-ink-muted text-sm'>
          {entryKind === 'languages' ? 'Languages' : 'Frameworks'}
        </span>
      </button>
    </TooltipTrigger>
  )
}

// Languages and frameworks, one on each side of the axis, together as wide
// as the rows of language logos under them. Each count is what the list
// shows with that kind chosen, under the other filters. The catalog only:
// the adjacent list has no language entries.
const kindChoicesView = ({
  entries,
  filter,
  dispatch,
}: {
  entries: Framework[]
  filter: ListingFilter
  dispatch: Dispatcher<Msg>
}) => (
  <div className='grid grid-cols-2 gap-[16px] lg:gap-[22px]'>
    {entryKinds.map((entryKind) =>
      kindChoiceView({
        entryKind,
        count: filterFrameworks({ ...filter, show: O.some(entryKind) })(entries)
          .length,
        filter,
        dispatch,
      }),
    )}
  </div>
)

// One language of the row: its logo, a choice like a radio button.
// Choosing it narrows the list to it, and choosing it again shows every
// language. The chosen one has the blue edge; hovering one draws the blue
// shadow of the layout buttons
const languageChoiceView = ({
  language,
  count,
  filter,
  dispatch,
}: {
  language: string
  count: number
  filter: ListingFilter
  dispatch: Dispatcher<Msg>
}) => {
  const isChosen = pipe(
    filter.language,
    O.exists((shown) => shown === language),
  )
  return (
    <TooltipTrigger
      key={language}
      id={`filter-language-${language}`}
      content={{
        title: language,
        text: `${count} ${count === 1 ? 'entry' : 'entries'} written in ${language}.`,
      }}
      touch={false}
      className='inline-flex'
    >
      <button
        type='button'
        aria-pressed={isChosen}
        aria-label={`${language}, ${count}`}
        onClick={() => dispatch({ _tag: 'ToggleLanguage', language })}
        className={cn(
          'bg-panel text-ink hover:border-edge hover:offset-shadow-edge flex size-[40px] items-center justify-center border-2 transition-shadow lg:size-[44px]',
          isChosen ? 'border-edge' : 'border-line',
        )}
      >
        {languageLogoView({ language, size: 'large' })}
      </button>
    </TooltipTrigger>
  )
}

// The rows of language logos, the most popular first, in rows as even as
// they can be (`balancedRows`), so the block is centred and never ends on
// a short row. The boxes have one size (40px, 44px on a desktop), and a row
// holds as many as fit the width of the window (`logosPerRowOf`): 7, 7, 6
// and 6 on a phone, 13 and 13 from a tablet up
const languageRowsView = ({
  rows,
  className,
  filter,
  dispatch,
}: {
  rows: { language: string; count: number }[][]
  className: string
  filter: ListingFilter
  dispatch: Dispatcher<Msg>
}) => (
  <div className={className}>
    {rows.map((row) => (
      <div
        key={row.map((c) => c.language).join()}
        className='flex justify-center gap-[6px] lg:gap-[8px]'
      >
        {row.map(({ language, count }) =>
          languageChoiceView({ language, count, filter, dispatch }),
        )}
      </div>
    ))}
  </div>
)

const languageChoicesView = ({
  entries,
  filter,
  logosPerRow,
  dispatch,
}: {
  entries: Framework[]
  filter: ListingFilter
  logosPerRow: number
  dispatch: Dispatcher<Msg>
}) =>
  languageRowsView({
    rows: balancedRows(languageCountsOf(entries), logosPerRow),
    className: 'flex flex-col gap-[6px] lg:gap-[8px]',
    filter,
    dispatch,
  })

// Rows of choice boxes: tiers or what an entry lacks, then targets
// ---------------------------------------------

// One choice of a row: a box in the colors of the badge or chip a card
// shows for it (`tone`), larger, with its count under the other filters.
// Every box has one width, so the rows line up.
// Choosing it narrows the list and fills it blue, like the chosen layout
// button (hovering it draws the blue edge and its shadow, like the other
// layout button); choosing it again clears it.
const choiceBoxView = ({
  id,
  label,
  icon,
  tone,
  tooltip,
  count,
  isChosen,
  onClick,
}: {
  id: string
  label: string
  icon: React.ReactNode
  tone: Tone
  // What choosing it means, on hover
  tooltip: Content
  count: number
  isChosen: boolean
  onClick: () => void
}) => (
  <TooltipTrigger
    key={id}
    id={`filter-${id}`}
    content={tooltip}
    touch={false}
    className='inline-flex'
  >
    <button
      type='button'
      aria-pressed={isChosen}
      aria-label={`${label}, ${count}`}
      onClick={onClick}
      className={cn(
        'flex h-[36px] w-[130px] items-center justify-center gap-[6px] border-2 px-[10px] text-sm whitespace-nowrap transition-shadow',
        isChosen
          ? 'border-accent bg-accent text-accent-ink'
          : cn(
              tone.fill,
              tone.border,
              'hover:border-edge hover:offset-shadow-edge',
            ),
      )}
    >
      {icon}
      {label}
      <span className='tabular-nums'>{count}</span>
    </button>
  </TooltipTrigger>
)

const choiceRowView = ({ children }: { children: React.ReactNode }) => (
  <div className='flex flex-wrap gap-[8px]'>{children}</div>
)

// The tiers of the catalog
const tierChoicesView = ({
  entries,
  filter,
  dispatch,
}: {
  entries: Framework[]
  filter: ListingFilter
  dispatch: Dispatcher<Msg>
}) =>
  choiceRowView({
    children: catalogTiers.map((tier) =>
      choiceBoxView({
        id: tier,
        tooltip: { title: tierLabel(tier), text: tierMeaning(tier) },
        label: tierLabel(tier),
        icon: null,
        tone: tierTone,
        count: filterFrameworks({ ...filter, tiers: [tier] })(entries).length,
        isChosen: filter.tiers.includes(tier),
        onClick: () =>
          dispatch({ _tag: 'ToggleTier', tier, options: [...catalogTiers] }),
      }),
    ),
  })

// What an entry of the adjacent list lacks
const lacksChoicesView = ({
  entries,
  filter,
  dispatch,
}: {
  entries: Framework[]
  filter: ListingFilter
  dispatch: Dispatcher<Msg>
}) =>
  choiceRowView({
    children: lackables.map((concept) =>
      choiceBoxView({
        id: concept,
        tooltip: {
          title: `Lacks ${conceptLabel(concept)}`,
          text: `${conceptLabel(concept)} is missing, or only reached in another shape. ${conceptMeaning(concept)}`,
        },
        label: `Lacks ${conceptLabel(concept)}`,
        icon: null,
        tone: gradeTone('missing'),
        count: filterFrameworks({ ...filter, lacks: [concept] })(entries)
          .length,
        isChosen: filter.lacks.includes(concept),
        onClick: () =>
          dispatch({
            _tag: 'ToggleLacks',
            concept,
            options: [...lackables],
          }),
      }),
    ),
  })

// The targets the entries of the list run on, in the order of `targets`
const targetChoicesView = ({
  entries,
  filter,
  dispatch,
}: {
  entries: Framework[]
  filter: ListingFilter
  dispatch: Dispatcher<Msg>
}) => {
  const options = targets.filter((target) =>
    entries.some((f) => f.targets.includes(target)),
  )
  return choiceRowView({
    children: options.map((target) =>
      choiceBoxView({
        id: target,
        tooltip: {
          title: targetLabel(target),
          text: targetMeaning(target),
        },
        label: targetLabel(target),
        icon: targetIconView({ target }),
        tone: targetTone,
        count: filterFrameworks({ ...filter, targets: [target] })(entries)
          .length,
        isChosen: filter.targets.includes(target),
        onClick: () => dispatch({ _tag: 'ToggleTarget', target, options }),
      }),
    ),
  })
}

// Active, quiet and archived, each with the dot a card shows: the first
// two are chosen until others are
const statusChoicesView = ({
  entries,
  filter,
  dispatch,
}: {
  entries: Framework[]
  filter: ListingFilter
  dispatch: Dispatcher<Msg>
}) =>
  choiceRowView({
    children: statuses.map((status) =>
      choiceBoxView({
        id: status,
        tooltip: { title: statusLabel(status), text: statusMeaning(status) },
        label: statusLabel(status),
        icon: statusDotView({
          status,
          isOnAccent: filter.statuses.includes(status),
        }),
        tone: tierTone,
        count: filterFrameworks({ ...filter, statuses: [status] })(entries)
          .length,
        isChosen: filter.statuses.includes(status),
        onClick: () => dispatch({ _tag: 'ToggleStatus', status }),
      }),
    ),
  })

// Search, and the toolbar of the results: layout, archive and count
// ---------------------------------------------

const layoutButtonView = ({
  layout,
  current,
  dispatch,
}: {
  layout: ListingLayout
  current: ListingLayout
  dispatch: Dispatcher<Msg>
}) => (
  <button
    type='button'
    aria-pressed={layout === current}
    onClick={() => dispatch({ _tag: 'SetLayout', layout })}
    className={cn(
      'flex h-[38px] items-center gap-[6px] border-2 px-[14px] text-[0.9375rem] transition-shadow',
      layout === current
        ? 'border-accent bg-accent text-accent-ink'
        : 'border-edge bg-panel text-accent hover:offset-shadow-edge',
    )}
  >
    {layout === 'cards' ? (
      <IconLayoutGrid size={16} stroke={1.75} />
    ) : (
      <IconTable size={16} stroke={1.75} />
    )}
    {layout === 'cards' ? 'Cards' : 'Table'}
  </button>
)

// The search across the whole list, under the filter rows
const searchView = ({
  filter,
  dispatch,
}: {
  filter: ListingFilter
  dispatch: Dispatcher<Msg>
}) => (
  <label className='relative flex min-w-0 flex-1 items-center'>
    <IconSearch
      size={18}
      stroke={1.75}
      className='text-ink-faint pointer-events-none absolute left-[12px]'
    />
    <input
      type='search'
      aria-label='Search'
      placeholder='Search by name, language, status, target or idea'
      value={filter.query}
      onChange={(e) => dispatch({ _tag: 'SetQuery', query: e.target.value })}
      className='border-line bg-panel text-ink placeholder:text-ink-faint focus:border-edge h-[40px] w-full rounded-none border pr-[12px] pl-[38px] text-[0.9375rem] outline-none'
    />
  </label>
)

// How many of the filters in the popover differ from their default: the
// tier (or what an entry lacks), the target and the status
const panelFilterCountOf = (filter: ListingFilter): number =>
  [
    filter.tiers.length > 0,
    filter.lacks.length > 0,
    filter.targets.length > 0,
    !A.getEq(S.Eq).equals(filter.statuses, defaultStatuses()),
  ].filter((isOn) => isOn).length

// A row of the popover: its name, then its boxes
const panelSectionView = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <div className='flex flex-col gap-[8px]'>
    <span className='text-ink-muted text-xs tracking-wide uppercase'>
      {title}
    </span>
    {children}
  </div>
)

// The search, and on its right the Filters button with its popover: the
// tiers (or, on the adjacent list, what an entry lacks), the targets and
// the statuses, each a choice of several (`toggleChoice`),
// in a box with a sharp blue edge, like the button, and no shadow.
// The popover fades in rising 4px (`starting:`) and out the same way while
// the model keeps it `closing`; a press outside it or Escape closes it.
const searchRowView = ({
  kind,
  entries,
  model,
  dispatch,
}: {
  kind: ListKind
  entries: Framework[]
  model: Model
  dispatch: Dispatcher<Msg>
}) => {
  const count = panelFilterCountOf(model.filter)
  const isOpen = model.panel === 'open'
  return (
    <div className='flex items-stretch gap-[10px]'>
      {searchView({ filter: model.filter, dispatch })}
      <div className='relative flex' {...{ [PANEL_ATTRIBUTE]: '' }}>
        <button
          type='button'
          aria-expanded={isOpen}
          aria-haspopup='dialog'
          onClick={() => dispatch({ _tag: 'TogglePanel' })}
          className={cn(
            'flex h-[40px] items-center gap-[6px] border px-[14px] text-[0.9375rem] whitespace-nowrap transition-colors',
            // Filled blue while a filter of it is on, blue while open, grey
            // like the search otherwise
            count > 0
              ? 'border-accent bg-accent text-accent-ink'
              : isOpen
                ? 'border-edge bg-panel text-accent'
                : 'border-line bg-panel text-ink-muted hover:border-edge hover:text-accent',
          )}
        >
          <IconAdjustmentsHorizontal size={17} stroke={1.75} aria-hidden />
          Filters
          {count > 0 && <span className='tabular-nums'>{count}</span>}
        </button>
        {model.panel !== 'closed' && (
          <div
            role='dialog'
            aria-label='Filters'
            className={cn(
              'border-edge bg-panel absolute top-full right-0 z-40 flex w-[452px] max-w-[calc(100vw-32px)] flex-col gap-[16px] border-2 p-[16px]',
              'transition-[opacity,translate] duration-150 ease-out motion-reduce:transition-none',
              'mt-[10px] starting:translate-y-[-4px] starting:opacity-0',
              model.panel === 'closing'
                ? 'translate-y-[-4px] opacity-0'
                : 'translate-y-0 opacity-100',
            )}
          >
            {panelSectionView({
              title: kind === 'catalog' ? 'Tier' : 'Lacks',
              children:
                kind === 'catalog'
                  ? tierChoicesView({ entries, filter: model.filter, dispatch })
                  : lacksChoicesView({
                      entries,
                      filter: model.filter,
                      dispatch,
                    }),
            })}
            {panelSectionView({
              title: 'Target',
              children: targetChoicesView({
                entries,
                filter: model.filter,
                dispatch,
              }),
            })}
            {panelSectionView({
              title: 'Status',
              children: statusChoicesView({
                entries,
                filter: model.filter,
                dispatch,
              }),
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// The sort menu of the cards (the table sorts by its headers): the order
// of the list, the most stars, the last push, the creation of the
// repository, or the day an entry joined the catalog. A sort only the
// table makes (by name, oldest first) shows as one more choice, chosen.
const sortMenuView = ({
  filter,
  dispatch,
}: {
  filter: ListingFilter
  dispatch: Dispatcher<Msg>
}) => {
  const chosen = cardSortOf(filter.sort)
  return (
    <label className='border-edge bg-panel text-accent hover:offset-shadow-edge focus-within:offset-shadow-edge relative flex h-[38px] items-center border-2 text-[0.9375rem] transition-shadow'>
      <IconArrowsSort
        size={16}
        stroke={1.75}
        aria-hidden
        className='pointer-events-none absolute left-[12px]'
      />
      <select
        aria-label='Sort the cards'
        value={pipe(
          chosen,
          O.getOrElse((): string => 'table'),
        )}
        onChange={(e) =>
          pipe(
            [...cardSorts],
            A.findFirst((choice: CardSort) => choice === e.target.value),
            O.fold(
              () => undefined,
              (choice) =>
                dispatch({ _tag: 'SetSort', sort: sortOfCardSort(choice) }),
            ),
          )
        }
        className='h-full cursor-pointer appearance-none bg-transparent pr-[34px] pl-[34px] outline-none'
      >
        {O.isNone(chosen) &&
          pipe(
            filter.sort,
            O.fold(
              () => null,
              (sort) => (
                <option value='table' disabled>
                  {sortLabelOf(sort)}
                </option>
              ),
            ),
          )}
        {cardSorts.map((choice) => (
          <option key={choice} value={choice}>
            {cardSortLabel(choice)}
          </option>
        ))}
      </select>
      <IconChevronDown
        size={16}
        stroke={1.75}
        aria-hidden
        className='pointer-events-none absolute right-[12px]'
      />
    </label>
  )
}

// The toolbar right above the results: the layout and, in the card view,
// the sort menu on the left, the count and (while a filter is on) Clear
// filters on the right
const filterBarView = ({
  filter,
  shown,
  total,
  dispatch,
}: {
  filter: ListingFilter
  shown: number
  total: number
  dispatch: Dispatcher<Msg>
}) => (
  <div className='flex flex-wrap items-center justify-between gap-[12px]'>
    <div className='flex flex-wrap items-center gap-[12px]'>
      <div className='flex gap-[8px]'>
        {layoutButtonView({
          layout: 'cards',
          current: filter.layout,
          dispatch,
        })}
        {layoutButtonView({
          layout: 'table',
          current: filter.layout,
          dispatch,
        })}
      </div>
      {filter.layout === 'cards' && sortMenuView({ filter, dispatch })}
    </div>
    <div className='flex items-center gap-[12px]'>
      <span className='text-ink-muted text-sm whitespace-nowrap tabular-nums'>
        {shown} of {total}
      </span>
      {isFiltered(filter) && (
        <button
          type='button'
          onClick={() => dispatch({ _tag: 'ClearFilter' })}
          className='border-reset/40 bg-reset/10 text-reset hover:border-reset flex h-[38px] items-center gap-[6px] rounded-[2px] border px-[12px] text-sm whitespace-nowrap transition-colors'
        >
          <IconFilterOff size={16} stroke={1.75} aria-hidden />
          Clear filters
        </button>
      )}
    </div>
  </div>
)

// Results
// ---------------------------------------------

// When the repository was created and last pushed to, each with its icon,
// on one line; nothing for an entry with no public repository. Raised above
// the link that covers the card, for their tooltips.
const datesView = ({ framework }: { framework: Framework }) =>
  framework.createdAt === undefined ||
  framework.updatedAt === undefined ? null : (
    <span className='text-ink-faint relative z-10 flex items-center gap-[12px] text-xs'>
      {dateView({
        id: framework.id,
        which: 'created',
        day: framework.createdAt,
      })}
      {dateView({
        id: framework.id,
        which: 'updated',
        day: framework.updatedAt,
      })}
    </span>
  )

// The whole card opens the entry: its name is the link, stretched over the
// card (`stretched-link`), so the code button (a link of its own, which
// cannot sit inside another) and the rubric strip (for its tooltips) are
// raised above it with `relative z-10`. Pressing the card shows its hover
// look, like any other link while pressed. An entry found after the first
// list wears the ribbon "Recently added" on its right edge.
const cardView = ({
  framework,
  recentSince,
}: {
  framework: Framework
  recentSince: string
}) => (
  <div
    key={framework.id}
    className='border-line bg-panel offset-shadow hover:border-edge hover:offset-shadow-edge relative flex flex-col gap-[12px] rounded-[3px] border p-[18px] transition-shadow'
  >
    {isRecentlyAdded(framework, recentSince) && recentEdgeRibbonView()}
    <div className='flex items-start gap-[12px]'>
      {frameworkTileView({ framework, size: 'card' })}
      {/* Room on the right for the ribbon of a recent entry, which reaches
          in from the edge of the card under the tier badge */}
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col',
          isRecentlyAdded(framework, recentSince) && 'pr-[12px]',
        )}
      >
        <Link
          destination={destinationOfScreen(frameworkScreen(framework.id))}
          className='text-ink stretched-link truncate text-[1.1875rem] leading-snug font-normal'
        >
          {framework.name}
        </Link>
        <span className='text-ink-muted flex items-center gap-[6px] text-sm'>
          {languageLineLogoView({ framework, size: 'small' })}
          <span className='truncate'>{kindLineOf(framework)}</span>
        </span>
      </div>
      {tierBadgeView({ tier: framework.tier })}
    </div>
    {/* Above the link that covers the card, so a part shows its tooltip
        under the mouse; a link to the same page itself, so a click on a
        part still opens the entry. Out of the tab order: the name is the
        one link of the card for the keyboard. */}
    <Link
      destination={destinationOfScreen(frameworkScreen(framework.id))}
      tabIndex={-1}
      className='relative z-10 block'
    >
      {rubricStripView({
        id: framework.id,
        rubric: framework.rubric,
        isInLink: true,
      })}
    </Link>
    <p className='text-ink-muted line-clamp-3 flex-1 text-sm'>
      {framework.summary}
    </p>
    <div className='flex flex-col gap-[8px]'>
      <div className='flex items-start justify-between gap-[8px] text-xs'>
        {targetChipsView({ targets: framework.targets, align: 'start' })}
        {sourceLinkView({ framework })}
      </div>
      <div className='flex flex-wrap items-center justify-between gap-x-[10px] gap-y-[4px]'>
        {statusView({ status: framework.status })}
        {datesView({ framework })}
      </div>
    </div>
  </div>
)

// One column on a phone, two on a tablet (`tablet:`, the exception to
// `lg:` only), three on a desktop
const cardsView = ({
  shown,
  recentSince,
}: {
  shown: Framework[]
  recentSince: string
}) => (
  <div className='tablet:grid-cols-2 grid grid-cols-1 gap-[22px] lg:grid-cols-3'>
    {shown.map((framework) => cardView({ framework, recentSince }))}
  </div>
)

// A header of the table that sorts by its column: the arrow shows the
// column sorted by and its direction, a faint double arrow the others
const sortHeaderView = ({
  column,
  label,
  align,
  sort,
  dispatch,
}: {
  column: SortColumn
  label: string
  align: 'left' | 'right'
  sort: O.Option<ListingSort>
  dispatch: Dispatcher<Msg>
}) => {
  const direction = pipe(
    sort,
    O.filter((s) => s.column === column),
    O.map((s) => s.direction),
  )
  return (
    <th
      aria-sort={pipe(
        direction,
        O.fold(
          (): 'none' | 'ascending' | 'descending' => 'none',
          (d) => d,
        ),
      )}
      className={cn(
        'px-[10px] py-[8px] font-normal first:pl-[14px] last:pr-[14px]',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      <button
        type='button'
        onClick={() => dispatch({ _tag: 'SortBy', column })}
        className={cn(
          'hover:text-ink inline-flex items-center gap-[4px] whitespace-nowrap',
          O.isSome(direction) ? 'text-accent' : 'text-ink-muted',
        )}
      >
        {label}
        {pipe(
          direction,
          O.fold(
            () => (
              <IconArrowsSort
                size={13}
                stroke={1.75}
                className='opacity-50'
                aria-hidden
              />
            ),
            (d) =>
              d === 'ascending' ? (
                <IconArrowUp size={13} stroke={2} aria-hidden />
              ) : (
                <IconArrowDown size={13} stroke={2} aria-hidden />
              ),
          ),
        )}
      </button>
    </th>
  )
}

const tableView = ({
  shown,
  sort,
  dispatch,
}: {
  shown: Framework[]
  sort: O.Option<ListingSort>
  dispatch: Dispatcher<Msg>
}) => (
  <div className='border-line bg-panel offset-shadow overflow-x-auto rounded-[3px] border'>
    <table className='w-full min-w-[1000px] border-collapse text-sm'>
      <thead>
        <tr className='border-line text-ink-muted border-b text-left text-xs'>
          {sortHeaderView({
            column: 'name',
            label: 'Framework',
            align: 'left',
            sort,
            dispatch,
          })}
          {sortHeaderView({
            column: 'tier',
            label: 'Tier',
            align: 'left',
            sort,
            dispatch,
          })}
          {sortHeaderView({
            column: 'rubric',
            label: 'Rubric',
            align: 'left',
            sort,
            dispatch,
          })}
          {sortHeaderView({
            column: 'status',
            label: 'Status',
            align: 'left',
            sort,
            dispatch,
          })}
          {sortHeaderView({
            column: 'stars',
            label: 'Stars',
            align: 'right',
            sort,
            dispatch,
          })}
          {sortHeaderView({
            column: 'created',
            label: 'Created',
            align: 'left',
            sort,
            dispatch,
          })}
          {sortHeaderView({
            column: 'updated',
            label: 'Updated',
            align: 'left',
            sort,
            dispatch,
          })}
          {sortHeaderView({
            column: 'added',
            label: 'Added',
            align: 'left',
            sort,
            dispatch,
          })}
        </tr>
      </thead>
      <tbody>
        {shown.map((framework) => (
          <tr
            key={framework.id}
            className='border-line hover:bg-field border-b last:border-b-0'
          >
            <td className='px-[14px] py-[10px]'>
              <Link
                destination={destinationOfScreen(frameworkScreen(framework.id))}
                className='flex items-center gap-[10px]'
              >
                {frameworkTileView({ framework, size: 'row' })}
                <span className='flex flex-col'>
                  <span className='text-ink hover:text-accent font-normal'>
                    {framework.name}
                  </span>
                  <span className='text-ink-muted flex items-center gap-[5px] text-xs'>
                    {languageLineLogoView({ framework, size: 'small' })}
                    {kindLineOf(framework)}
                  </span>
                </span>
              </Link>
            </td>
            <td className='px-[10px] py-[10px]'>
              {tierBadgeView({ tier: framework.tier })}
            </td>
            {/* The rubric strip of the cards: one cell per part, in the
                same order on every row, so the parts line up down the
                table */}
            <td className='w-[300px] px-[10px] py-[10px]'>
              {rubricStripView({ id: framework.id, rubric: framework.rubric })}
            </td>
            <td className='px-[10px] py-[10px] whitespace-nowrap'>
              {statusView({ status: framework.status })}
            </td>
            <td className='px-[10px] py-[10px] text-xs whitespace-nowrap'>
              <span className='flex justify-end'>
                {sourceLinkView({ framework })}
              </span>
            </td>
            <td className='text-ink-muted px-[10px] py-[10px] text-xs whitespace-nowrap tabular-nums'>
              {framework.createdAt === undefined
                ? ''
                : dateView({
                    id: `${framework.id}-row`,
                    which: 'created',
                    day: framework.createdAt,
                  })}
            </td>
            <td className='text-ink-muted px-[10px] py-[10px] text-xs whitespace-nowrap tabular-nums'>
              {framework.updatedAt === undefined
                ? ''
                : dateView({
                    id: `${framework.id}-row`,
                    which: 'updated',
                    day: framework.updatedAt,
                  })}
            </td>
            <td className='text-ink-muted py-[10px] pr-[14px] pl-[10px] text-xs whitespace-nowrap tabular-nums'>
              {dateView({
                id: `${framework.id}-row`,
                which: 'added',
                day: framework.discoveredAt,
              })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

// Nothing to show: only ever under a filter, so the toolbar above it
// already offers to clear them. When the archive holds matches the list
// hides, it says how many and offers to show them; when the other list
// matches the search, it says how many and links to that search there.
const emptyView = ({
  kind,
  entries,
  filter,
  dispatch,
}: {
  kind: ListKind
  entries: Framework[]
  filter: ListingFilter
  dispatch: Dispatcher<Msg>
}) => {
  const archivedCount =
    filter.statuses.length === 0 || filter.statuses.includes('archived')
      ? 0
      : filterFrameworks({ ...filter, statuses: ['archived'] })(entries).length
  const noun =
    kind === 'catalog'
      ? archivedCount === 1
        ? 'framework'
        : 'frameworks'
      : archivedCount === 1
        ? 'library'
        : 'libraries'
  const query = filter.query.trim()
  const other = otherListMatchesOf(kind, query)
  return (
    <div className='border-line flex flex-col items-center gap-[10px] rounded-[3px] border border-dashed px-[16px] py-[48px] text-center'>
      <span className='text-ink text-base font-normal'>
        {archivedCount === 0
          ? 'Nothing matches these filters'
          : `Nothing that is still maintained matches these filters, but ${archivedCount} archived ${noun} ${archivedCount === 1 ? 'does' : 'do'}.`}
      </span>
      {archivedCount > 0 && (
        <button
          type='button'
          onClick={() => dispatch({ _tag: 'ToggleStatus', status: 'archived' })}
          className='border-edge bg-panel text-accent hover:offset-shadow-edge flex items-center gap-[6px] border-2 px-[14px] py-[6px] text-sm transition-shadow'
        >
          <IconArchive size={16} stroke={1.75} aria-hidden />
          Show the archived {noun}
        </button>
      )}
      {/* The other list has what this search names: the TEA-adjacent page
          for a library that is not TEA, the catalog for one that is */}
      {pipe(
        other,
        O.fold(
          () => null,
          (matches) => (
            <>
              <span className='text-ink-muted text-sm text-balance'>
                {otherListMatchTextOf({
                  kind,
                  matches,
                  query,
                  isAlso: false,
                })}
              </span>
              <Link
                destination={otherListLinkOf(kind, matches).destination}
                className='border-edge bg-panel text-accent hover:offset-shadow-edge flex items-center gap-[6px] border-2 px-[14px] py-[6px] text-sm transition-shadow'
              >
                <IconSearch size={16} stroke={1.75} aria-hidden />
                {otherListLinkOf(kind, matches).label}
              </Link>
            </>
          ),
        ),
      )}
    </div>
  )
}

// Results found, and the other list matches the search too: one quiet line
// above the results, so a search for "react" on the catalog also points to
// the React libraries of the TEA-adjacent page. Nothing for an empty search
// or one the other list does not match.
const otherListHintView = ({
  kind,
  filter,
}: {
  kind: ListKind
  filter: ListingFilter
}) => {
  const query = filter.query.trim()
  return pipe(
    otherListMatchesOf(kind, query),
    O.fold(
      () => null,
      (matches) => (
        <p className='text-ink-muted flex flex-wrap items-center justify-center gap-x-[8px] gap-y-[2px] text-center text-sm'>
          <span>
            {otherListMatchTextOf({ kind, matches, query, isAlso: true })}
          </span>
          <Link
            destination={otherListLinkOf(kind, matches).destination}
            className='text-accent inline-flex items-center gap-[4px] hover:underline'
          >
            <IconSearch size={14} stroke={1.75} aria-hidden />
            {otherListLinkOf(kind, matches).label}
          </Link>
        </p>
      ),
    ),
  )
}

// Screen
// ---------------------------------------------

const headingOf = (kind: ListKind) => {
  switch (kind) {
    case 'catalog':
      return {
        title: 'The Elm Architecture, everywhere',
        lead: 'Every language and framework that implements Model, Msg, update, Cmd and Sub, graded against Elm, so you can see what each ecosystem has and what it could bring back.',
      }
    case 'adjacent':
      return {
        title: 'TEA-adjacent',
        lead: 'Libraries that share the vocabulary of TEA but lack a hard requirement of the rubric, graded the same way, so you can see exactly what keeps each one out.',
      }
  }
}

const ListingComponent = ({
  kind,
  model,
  logosPerRow,
  recentSince,
  dispatch,
}: Props) => {
  const entries = entriesOf(kind)
  const shown = pipe(
    entries,
    filterFrameworks(model.filter),
    sortFrameworks(model.filter.sort),
  )
  const heading = headingOf(kind)
  return (
    // Three groups, a wide gap between them and tight gaps inside: the
    // hero, the filters (kind boxes, logo row, search), the results
    <div className='flex flex-col gap-[44px]'>
      <section className='flex flex-col items-center gap-[12px] text-center'>
        <h1 className='text-ink text-[2rem] leading-tight font-normal text-balance lg:text-[2.625rem]'>
          {heading.title}
        </h1>
        <p className='text-ink-muted max-w-[640px] text-base text-balance'>
          {heading.lead}
        </p>
      </section>
      <div className='flex flex-col gap-[20px]'>
        {/* One centred column as wide as the widest row of logos: the kind
            boxes stretch to it */}
        <div className='flex justify-center'>
          <div className='flex flex-col gap-[24px]'>
            {kind === 'catalog' &&
              kindChoicesView({ entries, filter: model.filter, dispatch })}
            {languageChoicesView({
              entries,
              filter: model.filter,
              logosPerRow,
              dispatch,
            })}
          </div>
        </div>
        {searchRowView({ kind, entries, model, dispatch })}
      </div>
      {/* The toolbar sits right on the results it acts on */}
      <div className='flex flex-col gap-[14px]'>
        {filterBarView({
          filter: model.filter,
          shown: shown.length,
          total: entries.length,
          dispatch,
        })}
        {shown.length > 0 && otherListHintView({ kind, filter: model.filter })}
        {shown.length === 0
          ? emptyView({ kind, entries, filter: model.filter, dispatch })
          : model.filter.layout === 'cards'
            ? cardsView({ shown, recentSince })
            : tableView({ shown, sort: model.filter.sort, dispatch })}
      </div>
    </div>
  )
}

export const ListingMemo = memo(ListingComponent, PropsEq.equals)
