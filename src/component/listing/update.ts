import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { Cmd, Task, Time } from 'tea-cup-fp'

import {
  type ListingFilter,
  type ListingSort,
  defaultListingFilter,
  firstDirectionOf,
  toggleChoice,
  toggleStatus,
} from '@/common/type/destination'

import { type Model, type Msg } from './type'

// How long the filter popover fades out (the `duration` of its view)
export const PANEL_LEAVE_DURATION = 150

export const init = (filter: ListingFilter): Model => ({
  filter,
  panel: 'closed',
  panelSeq: 0,
})

const withFilter = (model: Model, filter: ListingFilter): [Model, Cmd<Msg>] => [
  { ...model, filter },
  Cmd.none(),
]

// The popover fades out first (`closing`, then `PanelClosed`); one already
// closed or closing stays as it is
const closePanel = (model: Model): [Model, Cmd<Msg>] => {
  const panelSeq = model.panelSeq + 1
  return model.panel === 'open'
    ? [
        { ...model, panel: 'closing', panelSeq },
        Task.perform(Time.in(PANEL_LEAVE_DURATION), (): Msg => ({
          _tag: 'PanelClosed',
          seq: panelSeq,
        })),
      ]
    : [model, Cmd.none()]
}

// A filter change updates the model only: the URL follows after the step
// (`withUrl`), as a replace while typing a query
export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'ToggleTier':
      return withFilter(model, {
        ...model.filter,
        tiers: toggleChoice(msg.options, model.filter.tiers, msg.tier),
      })
    case 'ToggleLacks':
      return withFilter(model, {
        ...model.filter,
        lacks: toggleChoice(msg.options, model.filter.lacks, msg.concept),
      })
    case 'ToggleTarget':
      return withFilter(model, {
        ...model.filter,
        targets: toggleChoice(msg.options, model.filter.targets, msg.target),
      })
    case 'ToggleStatus':
      return withFilter(model, {
        ...model.filter,
        statuses: toggleStatus(model.filter.statuses, msg.status),
      })
    case 'SetQuery':
      return withFilter(model, { ...model.filter, query: msg.query })
    case 'ToggleShow':
      return withFilter(model, {
        ...model.filter,
        show: pipe(
          model.filter.show,
          O.exists((shown) => shown === msg.category),
        )
          ? O.none
          : O.some(msg.category),
      })
    case 'ToggleLanguage':
      return withFilter(model, {
        ...model.filter,
        language: pipe(
          model.filter.language,
          O.exists((shown) => shown === msg.language),
        )
          ? O.none
          : O.some(msg.language),
      })
    case 'SetLayout':
      return withFilter(model, { ...model.filter, layout: msg.layout })
    case 'SortBy':
      return withFilter(model, {
        ...model.filter,
        sort: O.some(
          pipe(
            model.filter.sort,
            O.filter((sort) => sort.column === msg.column),
            O.fold(
              (): ListingSort => ({
                column: msg.column,
                direction: firstDirectionOf(msg.column),
              }),
              (sort): ListingSort => ({
                column: sort.column,
                direction:
                  sort.direction === 'ascending' ? 'descending' : 'ascending',
              }),
            ),
          ),
        ),
      })
    case 'SetSort':
      return withFilter(model, { ...model.filter, sort: msg.sort })
    // Clears what narrows the list; how it is shown (layout, sort) stays
    case 'ClearFilter':
      return withFilter(model, {
        ...defaultListingFilter(),
        layout: model.filter.layout,
        sort: model.filter.sort,
      })
    // The Filters button opens the popover, or closes it when open
    case 'TogglePanel':
      return model.panel === 'open'
        ? closePanel(model)
        : [
            { ...model, panel: 'open', panelSeq: model.panelSeq + 1 },
            Cmd.none(),
          ]
    case 'PanelKeyDown':
      return msg.key === 'Escape' ? closePanel(model) : [model, Cmd.none()]
    // A press outside the popover and its button closes it
    case 'PanelPointerDown':
      return msg.isInside ? [model, Cmd.none()] : closePanel(model)
    case 'PanelClosed':
      return [
        msg.seq === model.panelSeq && model.panel === 'closing'
          ? { ...model, panel: 'closed' }
          : model,
        Cmd.none(),
      ]
  }
}
