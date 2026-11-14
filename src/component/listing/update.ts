import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { Cmd, Task, Time } from 'tea-cup-fp'

import {
  type ListingFilter,
  type ListingSort,
  defaultAdjacentFilter,
  defaultCatalogFilter,
  firstDirectionOf,
  toggleChoice,
  toggleStatus,
} from '@/common/type/destination'

import { type Model, type Msg } from './type'

// Matches the `duration` of the fade of the popover in its view
export const PANEL_LEAVE_DURATION = 150

export const init = <F extends ListingFilter>(filter: F): Model<F> => ({
  filter,
  panel: 'closed',
  panelSeq: 0,
})

const withFilter = <F extends ListingFilter>(
  model: Model<F>,
  filter: F,
): [Model<F>, Cmd<Msg>] => [{ ...model, filter }, Cmd.none()]

const closePanel = <F extends ListingFilter>(
  model: Model<F>,
): [Model<F>, Cmd<Msg>] => {
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
// (`withUrl`), as a replace while typing a query or changing only the order
// (`isRefinement`)
export const update = <F extends ListingFilter>(
  msg: Msg,
  model: Model<F>,
): [Model<F>, Cmd<Msg>] => {
  const filter = model.filter
  switch (msg._tag) {
    case 'ToggleTier':
      return filter.list === 'catalog'
        ? withFilter(model, {
            ...filter,
            tiers: toggleChoice(msg.options, filter.tiers, msg.tier),
          })
        : [model, Cmd.none()]
    case 'ToggleLacks':
      return filter.list === 'adjacent'
        ? withFilter(model, {
            ...filter,
            lacks: toggleChoice(msg.options, filter.lacks, msg.concept),
          })
        : [model, Cmd.none()]
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
      return filter.list === 'catalog'
        ? withFilter(model, {
            ...filter,
            show: pipe(
              filter.show,
              O.exists((shown) => shown === msg.category),
            )
              ? O.none
              : O.some(msg.category),
          })
        : [model, Cmd.none()]
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
    // How the list is shown (layout, sort) stays
    case 'ClearFilter':
      return withFilter(
        model,
        filter.list === 'catalog'
          ? {
              ...filter,
              ...defaultCatalogFilter(),
              layout: filter.layout,
              sort: filter.sort,
            }
          : {
              ...filter,
              ...defaultAdjacentFilter(),
              layout: filter.layout,
              sort: filter.sort,
            },
      )
    case 'TogglePanel':
      return model.panel === 'open'
        ? closePanel(model)
        : [
            { ...model, panel: 'open', panelSeq: model.panelSeq + 1 },
            Cmd.none(),
          ]
    case 'PanelKeyDown':
      return msg.key === 'Escape' ? closePanel(model) : [model, Cmd.none()]
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
