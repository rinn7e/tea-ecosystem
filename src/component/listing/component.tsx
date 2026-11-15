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
import React, { memo } from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { type ListId, entriesOf, targetOptionsOf } from '@/common/data/catalog'
import {
  type AdjacentFilter,
  type CatalogFilter,
  type EntryCategory,
  type ListingFilter,
  type ListingLayout,
  type ListingSort,
  type SortColumn,
  catalogTiers,
  choiceOf,
  destinationOfScreen,
  frameworkScreen,
  isStatusTicked,
  isTicked,
  lackables,
  statusChoiceOf,
} from '@/common/type/destination'
import {
  type Framework,
  addedDayOf,
  cardRibbonOf,
  statuses,
} from '@/common/type/framework'
import {
  type Tone,
  conceptLabel,
  conceptMeaning,
  dateView,
  edgeRibbonView,
  gradeTone,
  languageLineOf,
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
  archivedHintCountOf,
  balancedRows,
  cardSortLabel,
  cardSortOf,
  cardSortShortLabel,
  cardSorts,
  entryNounOf,
  filterFrameworks,
  hiddenArchivedCountOf,
  isFiltered,
  languageCountsOf,
  otherListLinkOf,
  otherListMatchTextOf,
  otherListMatchesOf,
  otherListRecentOf,
  otherListRecentTextOf,
  panelFilterCountOf,
  shownArchivedCountOf,
  sortFrameworks,
  sortLabelOf,
  sortOfCardSort,
  sortShortcutOf,
} from './util'

const entryCategories: readonly EntryCategory[] = ['languages', 'frameworks']

// Stats
// ---------------------------------------------

// A count that is also a choice, like a radio button
const categoryChoiceView = ({
  category,
  count,
  filter,
  dispatch,
}: {
  category: EntryCategory
  count: number
  filter: CatalogFilter
  dispatch: Dispatcher<Msg>
}) => {
  const isChosen = pipe(
    filter.show,
    O.exists((shown) => shown === category),
  )
  return (
    <TooltipTrigger
      key={category}
      id={`filter-category-${category}`}
      content={
        category === 'languages'
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
        onClick={() => dispatch({ _tag: 'ToggleShow', category })}
        className={cn(
          'bg-panel flex w-full flex-col items-center justify-center gap-[2px] border-2 px-[12px] py-[6px] text-center transition-shadow sm:py-[10px]',
          isChosen
            ? 'border-edge offset-shadow-edge'
            : 'border-line offset-shadow hover:border-edge',
        )}
      >
        <span
          className={cn(
            'text-[1.5rem] leading-none font-normal tabular-nums sm:text-[2rem]',
            isChosen ? 'text-accent' : 'text-ink',
          )}
        >
          {count}
        </span>
        <span className='text-ink-muted text-[0.8125rem] sm:text-sm'>
          {category === 'languages' ? 'Languages' : 'Frameworks'}
        </span>
      </button>
    </TooltipTrigger>
  )
}

// Together as wide as the rows of language logos under them. Each count is
// what the list shows with that category chosen, under the other filters.
// The catalog only: the adjacent list has no language entries.
const categoryChoicesView = ({
  entries,
  filter,
  dispatch,
}: {
  entries: Framework[]
  filter: CatalogFilter
  dispatch: Dispatcher<Msg>
}) => (
  <div className='grid grid-cols-2 gap-[16px] lg:gap-[22px]'>
    {entryCategories.map((category) =>
      categoryChoiceView({
        category,
        count: filterFrameworks({ ...filter, show: O.some(category) })(entries)
          .length,
        filter,
        dispatch,
      }),
    )}
  </div>
)

// A choice like a radio button; hovering one draws the blue shadow of the
// layout buttons
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
          'bg-panel text-ink hover:border-edge hover:offset-shadow-edge flex size-[32px] items-center justify-center border-2 transition-shadow sm:size-[40px] lg:size-[44px]',
          isChosen ? 'border-edge' : 'border-line',
        )}
      >
        {languageLogoView({ language, size: 'large' })}
      </button>
    </TooltipTrigger>
  )
}

// Rows as even as they can be (`balancedRows`), so the block is centred and
// never ends on a short row. A row holds as many as fit the window (`logosPerRowOf`, which
// repeats the sizes and gaps of the boxes here)
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
        className='flex justify-center gap-[5px] sm:gap-[6px] lg:gap-[8px]'
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
    className: 'flex flex-col gap-[5px] sm:gap-[6px] lg:gap-[8px]',
    filter,
    dispatch,
  })

// Rows of choice boxes: tiers or what an entry lacks, then targets
// ---------------------------------------------

// In the colors of the badge or chip a card shows for it (`tone`). Every
// box has one width, so the rows line up. Chosen, it fills blue like the
// chosen layout button; hovering it draws the blue edge and its shadow, like
// the other layout button.
// A `prefix` the title of its section already says ("Lacks") is left out
// on a phone, where three boxes share a row
const choiceBoxView = ({
  id,
  prefix,
  label,
  icon,
  tone,
  tooltip,
  count,
  isChosen,
  onClick,
}: {
  id: string
  prefix: O.Option<string>
  label: string
  icon: React.ReactNode
  tone: Tone
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
      aria-label={`${pipe(
        prefix,
        O.fold(
          () => '',
          (p) => `${p} `,
        ),
      )}${label}, ${count}`}
      onClick={onClick}
      className={cn(
        'flex h-[32px] w-full items-center justify-center gap-[4px] border-2 px-[4px] text-[0.8125rem] whitespace-nowrap transition-shadow sm:h-[36px] sm:w-[130px] sm:gap-[6px] sm:px-[10px] sm:text-sm',
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
      <span>
        {pipe(
          prefix,
          O.fold(
            () => null,
            (p) => <span className='hidden sm:inline'>{p} </span>,
          ),
        )}
        {label}
      </span>
      <span className='tabular-nums'>{count}</span>
    </button>
  </TooltipTrigger>
)

// Three a row on a phone, sized like its toolbar; from `sm:` up, boxes of
// one width that wrap
const choiceRowView = ({ children }: { children: React.ReactNode }) => (
  <div className='grid grid-cols-3 gap-[6px] sm:flex sm:flex-wrap sm:gap-[8px]'>
    {children}
  </div>
)

const tierChoicesView = ({
  entries,
  filter,
  dispatch,
}: {
  entries: Framework[]
  filter: CatalogFilter
  dispatch: Dispatcher<Msg>
}) =>
  choiceRowView({
    children: catalogTiers.map((tier) =>
      choiceBoxView({
        id: tier,
        prefix: O.none,
        tooltip: { title: tierLabel(tier), text: tierMeaning(tier) },
        label: tierLabel(tier),
        icon: null,
        tone: tierTone,
        count: filterFrameworks({
          ...filter,
          tiers: choiceOf(catalogTiers, [tier]),
        })(entries).length,
        isChosen: isTicked(filter.tiers, tier),
        onClick: () =>
          dispatch({ _tag: 'ToggleTier', tier, options: [...catalogTiers] }),
      }),
    ),
  })

const lacksChoicesView = ({
  entries,
  filter,
  dispatch,
}: {
  entries: Framework[]
  filter: AdjacentFilter
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
        prefix: O.some('Lacks'),
        label: conceptLabel(concept),
        icon: null,
        tone: gradeTone('missing'),
        count: filterFrameworks({
          ...filter,
          lacks: choiceOf(lackables, [concept]),
        })(entries).length,
        isChosen: isTicked(filter.lacks, concept),
        onClick: () =>
          dispatch({
            _tag: 'ToggleLacks',
            concept,
            options: [...lackables],
          }),
      }),
    ),
  })

const targetChoicesView = ({
  entries,
  filter,
  dispatch,
}: {
  entries: Framework[]
  filter: ListingFilter
  dispatch: Dispatcher<Msg>
}) => {
  const options = targetOptionsOf(filter.list)
  return choiceRowView({
    children: options.map((target) =>
      choiceBoxView({
        id: target,
        prefix: O.none,
        tooltip: {
          title: targetLabel(target),
          text: targetMeaning(target),
        },
        label: targetLabel(target),
        icon: targetIconView({ target }),
        tone: targetTone,
        count: filterFrameworks({
          ...filter,
          targets: choiceOf(options, [target]),
        })(entries).length,
        isChosen: isTicked(filter.targets, target),
        onClick: () => dispatch({ _tag: 'ToggleTarget', target, options }),
      }),
    ),
  })
}

// Each with the dot a card shows; active and quiet are chosen until others
// are
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
        prefix: O.none,
        tooltip: { title: statusLabel(status), text: statusMeaning(status) },
        label: statusLabel(status),
        icon: statusDotView({
          status,
          isOnAccent: isStatusTicked(filter.statuses, status),
        }),
        tone: tierTone,
        count: filterFrameworks({
          ...filter,
          statuses: statusChoiceOf([status]),
        })(entries).length,
        isChosen: isStatusTicked(filter.statuses, status),
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
    aria-label={layout === 'cards' ? 'Cards' : 'Table'}
    onClick={() => dispatch({ _tag: 'SetLayout', layout })}
    className={cn(
      'flex h-[32px] w-[32px] items-center justify-center gap-[6px] border-2 text-[0.9375rem] transition-shadow sm:h-[38px] sm:w-auto sm:px-[14px]',
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
    {/* An icon alone on a phone, so the toolbar keeps one row */}
    <span className='hidden sm:inline'>
      {layout === 'cards' ? 'Cards' : 'Table'}
    </span>
  </button>
)

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
      aria-label='Search by name, language, status, target or idea'
      value={filter.query}
      onChange={(e) => dispatch({ _tag: 'SetQuery', query: e.target.value })}
      className='border-line bg-panel text-ink focus:border-edge h-[36px] w-full rounded-none border pr-[12px] pl-[38px] text-base outline-none sm:h-[40px] lg:text-[0.9375rem]'
    />
    {/* The hint, drawn over the empty field in place of a placeholder, which
        cannot change with the width: a few words on a phone, where the long
        one was cut, and smaller than the text typed in. The field itself
        keeps 16px text on a phone, below which Safari zooms the page into
        it. */}
    {filter.query === '' && (
      <span
        aria-hidden='true'
        className='text-ink-faint pointer-events-none absolute right-[12px] left-[38px] truncate text-sm sm:text-base lg:text-[0.9375rem]'
      >
        <span className='sm:hidden'>Search name or language</span>
        <span className='hidden sm:inline'>
          Search by name, language, status, target or idea
        </span>
      </span>
    )}
  </label>
)

const panelSectionView = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <div className='flex flex-col gap-[6px] sm:gap-[8px]'>
    <span className='text-ink-muted text-[0.6875rem] tracking-wide uppercase sm:text-xs'>
      {title}
    </span>
    {children}
  </div>
)

// The popover has a sharp blue edge, like the button, and no shadow. It
// fades in rising 4px (`starting:`) and out the same way while the model
// keeps it `closing`.
const searchRowView = ({
  entries,
  model,
  dispatch,
}: {
  entries: Framework[]
  model: Model<ListingFilter>
  dispatch: Dispatcher<Msg>
}) => {
  const count = panelFilterCountOf(model.filter)
  const isOpen = model.panel === 'open'
  return (
    <div className='flex items-stretch gap-[6px] sm:gap-[10px]'>
      {searchView({ filter: model.filter, dispatch })}
      <div className='relative flex' {...{ [PANEL_ATTRIBUTE]: '' }}>
        <button
          type='button'
          aria-expanded={isOpen}
          aria-haspopup='dialog'
          aria-label={count > 0 ? `Filters, ${count} on` : 'Filters'}
          title='Filters'
          onClick={() => dispatch({ _tag: 'TogglePanel' })}
          className={cn(
            // Its icon alone, square, with the count of filters on beside it
            'flex h-[36px] min-w-[36px] items-center justify-center gap-[6px] border px-[9px] text-[0.9375rem] whitespace-nowrap transition-colors sm:h-[40px] sm:min-w-[40px] sm:px-[11px]',
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
          {count > 0 && (
            <span aria-hidden='true' className='tabular-nums'>
              {count}
            </span>
          )}
        </button>
        {model.panel !== 'closed' && (
          <div
            role='dialog'
            aria-label='Filters'
            className={cn(
              'border-edge bg-panel absolute top-full right-0 z-40 flex w-[452px] max-w-[calc(100vw-32px)] flex-col gap-[12px] border-2 p-[12px] sm:gap-[16px] sm:p-[16px]',
              'transition-[opacity,translate] duration-150 ease-out motion-reduce:transition-none',
              'mt-[10px] starting:translate-y-[-4px] starting:opacity-0',
              model.panel === 'closing'
                ? 'translate-y-[-4px] opacity-0'
                : 'translate-y-0 opacity-100',
            )}
          >
            {model.filter.list === 'catalog'
              ? panelSectionView({
                  title: 'Tier',
                  children: tierChoicesView({
                    entries,
                    filter: model.filter,
                    dispatch,
                  }),
                })
              : panelSectionView({
                  title: 'Lacks',
                  children: lacksChoicesView({
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

// The table sorts by its headers instead. A sort only the table makes (by
// name, oldest first) shows as one more choice, chosen. The menu draws its
// own label, one word on a phone (`cardSortShortLabel`), with the native
// select laid over it unseen, so the picker it opens is the one of the
// system with the full labels. Every label sits in one cell, so the menu
// keeps the width of the widest and does not jump when the choice changes.
const sortMenuView = ({
  filter,
  dispatch,
}: {
  filter: ListingFilter
  dispatch: Dispatcher<Msg>
}) => {
  const chosen = cardSortOf(filter.sort)
  const tableOnly = pipe(
    chosen,
    O.fold(
      () => pipe(filter.sort, O.map(sortLabelOf)),
      () => O.none,
    ),
  )
  const labels: {
    key: string
    short: string
    long: string
    isShown: boolean
  }[] = [
    ...pipe(
      tableOnly,
      O.fold(
        () => [],
        (label) => [{ key: 'table', short: label, long: label, isShown: true }],
      ),
    ),
    ...cardSorts.map((choice) => ({
      key: choice,
      short: cardSortShortLabel(choice),
      long: cardSortLabel(choice),
      isShown: pipe(
        chosen,
        O.exists((c) => c === choice),
      ),
    })),
  ]
  return (
    <label className='border-edge bg-panel text-accent hover:offset-shadow-edge focus-within:offset-shadow-edge relative flex h-[32px] items-center border-2 pr-[26px] pl-[28px] text-[0.8125rem] transition-shadow sm:h-[38px] sm:pr-[34px] sm:pl-[34px] sm:text-base lg:text-[0.9375rem]'>
      <IconArrowsSort
        size={16}
        stroke={1.75}
        aria-hidden
        className='pointer-events-none absolute left-[8px] sm:left-[12px]'
      />
      <span aria-hidden className='pointer-events-none grid whitespace-nowrap'>
        {labels.map((label) => (
          <span
            key={label.key}
            className={cn(
              'col-start-1 row-start-1',
              !label.isShown && 'invisible',
            )}
          >
            <span className='sm:hidden'>{label.short}</span>
            <span className='hidden sm:inline'>{label.long}</span>
          </span>
        ))}
      </span>
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
        className='absolute inset-0 cursor-pointer appearance-none opacity-0'
      >
        {pipe(
          tableOnly,
          O.fold(
            () => null,
            (label) => (
              <option value='table' disabled>
                {label}
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
        className='pointer-events-none absolute right-[8px] sm:right-[12px]'
      />
    </label>
  )
}

const sortShortcutView = ({
  filter,
  dispatch,
}: {
  filter: ListingFilter
  dispatch: Dispatcher<Msg>
}) => {
  const shortcut = sortShortcutOf(filter.sort)
  // On while the list shows the newest first: solid, as a chosen layout
  // is, and a press leads back to the order of the list
  const isOn = shortcut === 'default'
  return (
    <button
      type='button'
      aria-pressed={isOn}
      onClick={() =>
        dispatch({ _tag: 'SetSort', sort: sortOfCardSort(shortcut) })
      }
      aria-label='Sort by the newly added first'
      className={cn(
        'border-star flex h-[32px] items-center border-2 px-[10px] text-[0.8125rem] transition-shadow sm:h-[38px] sm:px-[14px] sm:text-[0.9375rem]',
        isOn
          ? 'bg-star text-on-star'
          : 'shine bg-star/15 text-star-ink hover:offset-shadow-star',
      )}
    >
      New
    </button>
  )
}

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
  <div className='flex flex-wrap items-center justify-between gap-[8px] sm:gap-[12px]'>
    <div className='flex flex-wrap items-center gap-[6px] sm:gap-[12px]'>
      <div className='flex gap-[6px] sm:gap-[8px]'>
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
      {filter.layout === 'cards' && sortShortcutView({ filter, dispatch })}
    </div>
    {/* A phone shows no count, so with no filter on this group is empty
        there and takes no row */}
    <div
      className={cn(
        'items-center gap-[8px] sm:flex sm:gap-[12px]',
        isFiltered(filter) ? 'flex' : 'hidden',
      )}
    >
      <span className='text-ink-muted hidden text-sm whitespace-nowrap tabular-nums sm:inline'>
        {shown} of {total}
      </span>
      {isFiltered(filter) && (
        <button
          type='button'
          onClick={() => dispatch({ _tag: 'ClearFilter' })}
          aria-label='Clear filters'
          className='border-reset/40 bg-reset/10 text-reset hover:border-reset flex h-[32px] items-center gap-[4px] rounded-[2px] border px-[8px] text-[0.8125rem] whitespace-nowrap transition-colors sm:h-[38px] sm:gap-[6px] sm:px-[12px] sm:text-sm'
        >
          <IconFilterOff size={16} stroke={1.75} aria-hidden />
          {/* One word on a phone */}
          <span className='sm:hidden'>Clear</span>
          <span className='hidden sm:inline'>Clear filters</span>
        </button>
      )}
    </div>
  </div>
)

// Results
// ---------------------------------------------

// Raised above the link that covers the card, for their tooltips
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

// The foot of a card on a phone, in one row: the status as its colored dot
// (its name for screen readers and in its tooltip), the targets as icons
// (named the same way), both days, and the source link. An entry with many
// targets wraps its days onto a second line. From `sm:` up the foot has two
// rows, with the status and the targets in words.
const phoneFooterView = ({ framework }: { framework: Framework }) => (
  <div className='flex items-center justify-between gap-[8px] sm:hidden'>
    <div className='text-ink-faint flex min-w-0 flex-wrap items-center gap-x-[10px] gap-y-[4px] text-xs'>
      <TooltipTrigger
        id={`${framework.id}-phone-status`}
        content={{
          title: statusLabel(framework.status),
          text: statusMeaning(framework.status),
        }}
        label={statusLabel(framework.status)}
        className='relative z-10 flex cursor-default items-center'
      >
        {statusDotView({ status: framework.status })}
      </TooltipTrigger>
      <span
        role='img'
        aria-label={`Targets: ${framework.targets.map(targetLabel).join(', ')}`}
        title={framework.targets.map(targetLabel).join(', ')}
        className='relative z-10 flex items-center gap-[4px]'
      >
        {framework.targets.map((target) => (
          <span key={target} className='flex'>
            {targetIconView({ target })}
          </span>
        ))}
      </span>
      {framework.createdAt !== undefined &&
        framework.updatedAt !== undefined && (
          <span className='relative z-10 flex items-center gap-[10px]'>
            {dateView({
              id: `${framework.id}-phone`,
              which: 'created',
              day: framework.createdAt,
            })}
            {dateView({
              id: `${framework.id}-phone`,
              which: 'updated',
              day: framework.updatedAt,
            })}
          </span>
        )}
    </div>
    {sourceLinkView({ framework })}
  </div>
)

// The whole card opens the entry: its name is the link, stretched over the
// card (`stretched-link`), so the code button (a link of its own, which
// cannot sit inside another) and the rubric strip (for its tooltips) are
// raised above it with `relative z-10`. Pressing the card shows its hover
// look, like any other link while pressed. The pick of the maintainer
// wears the ribbon "Featured" on its right edge, and an entry found after
// the first list "Recently added".
const cardView = ({
  framework,
  recentSince,
}: {
  framework: Framework
  recentSince: string
}) => {
  const ribbon = cardRibbonOf(framework, recentSince)
  return (
    <div
      key={framework.id}
      className='border-line bg-panel offset-shadow hover:border-edge hover:offset-shadow-edge relative flex flex-col gap-[6px] rounded-[3px] border p-[10px] transition-shadow sm:gap-[12px] sm:p-[18px]'
    >
      {pipe(
        ribbon,
        O.fold(
          () => null,
          (shown) => edgeRibbonView({ ribbon: shown }),
        ),
      )}
      <div className='flex items-start gap-[10px] sm:gap-[12px]'>
        {frameworkTileView({ framework, size: 'card' })}
        {/* Room on the right for the ribbon, which reaches in from the edge
          of the card under the tier badge */}
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col',
            O.isSome(ribbon) && 'pr-[12px]',
          )}
        >
          <Link
            destination={destinationOfScreen(frameworkScreen(framework.id))}
            className='text-ink stretched-link truncate text-[1.0625rem] leading-snug font-normal sm:text-[1.1875rem]'
          >
            {framework.name}
          </Link>
          <span className='text-ink-muted flex items-center gap-[6px] text-[0.8125rem] sm:text-sm'>
            {languageLineLogoView({ framework, size: 'small' })}
            <span className='truncate'>{languageLineOf(framework)}</span>
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
      <p className='text-ink-muted line-clamp-2 flex-1 text-sm sm:line-clamp-3'>
        {framework.summary}
      </p>
      {phoneFooterView({ framework })}
      <div className='hidden flex-col gap-[8px] sm:flex'>
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
}

// One column on a phone, two on a tablet, three on a desktop
const cardsView = ({
  shown,
  recentSince,
}: {
  shown: Framework[]
  recentSince: string
}) => (
  <div className='grid grid-cols-1 gap-[14px] sm:grid-cols-2 sm:gap-[22px] lg:grid-cols-3'>
    {shown.map((framework) => cardView({ framework, recentSince }))}
  </div>
)

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
                    {languageLineOf(framework)}
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
                day: addedDayOf(framework),
              })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

// Only ever under a filter, so the toolbar above it already offers to clear
// them
const emptyView = ({
  entries,
  filter,
  dispatch,
}: {
  entries: Framework[]
  filter: ListingFilter
  dispatch: Dispatcher<Msg>
}) => {
  const archivedCount = hiddenArchivedCountOf(entries, filter)
  const noun = entryNounOf(filter.list, archivedCount)
  const other = otherListMatchesOf(filter)
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
      {/* A library that is not TEA lives on the TEA-adjacent page, and one
          that is on the Main catalog */}
      {pipe(
        other,
        O.map((matches) => ({ matches, link: otherListLinkOf(matches) })),
        O.fold(
          () => null,
          ({ matches, link }) => (
            <>
              <span className='text-ink-muted text-sm text-balance'>
                {otherListMatchTextOf({ matches, isAlso: false })}
              </span>
              <Link
                destination={link.destination}
                className='border-edge bg-panel text-accent hover:offset-shadow-edge flex items-center gap-[6px] border-2 px-[14px] py-[6px] text-sm transition-shadow'
              >
                <IconSearch size={16} stroke={1.75} aria-hidden />
                {link.label}
              </Link>
            </>
          ),
        ),
      )}
    </div>
  )
}

// One quiet line above the results, so a filter does not hide that the
// archive holds more
const archivedHintView = ({
  entries,
  filter,
  dispatch,
}: {
  entries: Framework[]
  filter: ListingFilter
  dispatch: Dispatcher<Msg>
}) => {
  const hidden = archivedHintCountOf(entries, filter)
  const shown = shownArchivedCountOf(entries, filter)
  const count = hidden + shown
  const noun = entryNounOf(filter.list, count)
  return count === 0 ? null : (
    <p className='text-ink-muted flex flex-wrap items-center justify-center gap-x-[8px] gap-y-[2px] text-center text-sm'>
      <span>
        {hidden > 0
          ? `${count} archived ${noun} also ${count === 1 ? 'matches' : 'match'}.`
          : `${count} archived ${noun} ${count === 1 ? 'is' : 'are'} shown.`}
      </span>
      <button
        type='button'
        onClick={() => dispatch({ _tag: 'ToggleStatus', status: 'archived' })}
        className='text-accent inline-flex items-center gap-[4px] hover:underline'
      >
        <IconArchive size={14} stroke={1.75} aria-hidden />
        {hidden > 0 ? 'Show' : 'Hide'} the archived {noun}
      </button>
    </p>
  )
}

// So a search for "react", or the TypeScript logo, on the catalog also
// points to the matching libraries of the TEA-adjacent page; and the list
// shown newest first points to what the other list added recently. One
// line at most: the matches of a filter first.
const otherListHintView = ({
  filter,
  recentSince,
}: {
  filter: ListingFilter
  recentSince: string
}) => {
  return pipe(
    otherListMatchesOf(filter),
    O.map((matches) => ({
      text: otherListMatchTextOf({ matches, isAlso: true }),
      link: otherListLinkOf(matches),
    })),
    O.alt(() =>
      pipe(
        otherListRecentOf(filter, recentSince),
        O.map((recent) => ({
          text: otherListRecentTextOf(recent),
          link: otherListLinkOf(recent),
        })),
      ),
    ),
    O.fold(
      () => null,
      ({ text, link }) => (
        <p className='text-ink-muted flex flex-wrap items-center justify-center gap-x-[8px] gap-y-[2px] text-center text-sm'>
          <span>{text}</span>
          <Link
            destination={link.destination}
            className='text-accent inline-flex items-center gap-[4px] hover:underline'
          >
            <IconSearch size={14} stroke={1.75} aria-hidden />
            {link.label}
          </Link>
        </p>
      ),
    ),
  )
}

// Screen
// ---------------------------------------------

const headingOf = (list: ListId) => {
  switch (list) {
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
  model,
  logosPerRow,
  recentSince,
  dispatch,
}: Props) => {
  const list = model.filter.list
  const entries = entriesOf(list)
  const shown = pipe(
    entries,
    filterFrameworks(model.filter),
    sortFrameworks(model.filter.sort),
  )
  const heading = headingOf(list)
  return (
    // Three groups with tight gaps inside: the hero, the filters (category
    // boxes, logo row, search), the results, a wide gap between them. On a
    // phone the gap between the search and the toolbar is short, so the
    // first card shows on landing.
    <div className='flex flex-col'>
      <section className='flex flex-col items-center gap-[12px] text-center'>
        <h1 className='text-ink text-[1.625rem] leading-tight font-normal text-balance sm:text-[2rem] lg:text-[2.625rem]'>
          {heading.title}
        </h1>
        <p className='text-ink-muted max-w-[640px] text-sm text-balance sm:text-base'>
          {heading.lead}
        </p>
      </section>
      <div className='mt-[24px] flex flex-col gap-[20px] sm:mt-[44px]'>
        {/* One centred column as wide as the widest row of logos: the category
            boxes stretch to it */}
        <div className='flex justify-center'>
          <div className='flex flex-col gap-[16px] sm:gap-[24px]'>
            {model.filter.list === 'catalog' &&
              categoryChoicesView({ entries, filter: model.filter, dispatch })}
            {languageChoicesView({
              entries,
              filter: model.filter,
              logosPerRow,
              dispatch,
            })}
          </div>
        </div>
        {searchRowView({ entries, model, dispatch })}
      </div>
      {/* The toolbar sits right on the results it acts on */}
      <div className='mt-[16px] flex flex-col gap-[14px] sm:mt-[44px]'>
        {filterBarView({
          filter: model.filter,
          shown: shown.length,
          total: entries.length,
          dispatch,
        })}
        {shown.length > 0 &&
          archivedHintView({
            entries,
            filter: model.filter,
            dispatch,
          })}
        {shown.length > 0 &&
          otherListHintView({ filter: model.filter, recentSince })}
        {shown.length === 0
          ? emptyView({ entries, filter: model.filter, dispatch })
          : model.filter.layout === 'cards'
            ? cardsView({ shown, recentSince })
            : tableView({ shown, sort: model.filter.sort, dispatch })}
      </div>
    </div>
  )
}

export const ListingMemo = memo(ListingComponent, PropsEq.equals)
