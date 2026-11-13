import { cn } from '@rinn7e/tea-cup-prelude'
import { useLayoutEffect } from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { listOf } from '@/common/data/catalog'
import { SetGlobalMsgContext } from '@/common/global-context'
import { backToTopView } from '@/component/back-to-top'
import { FooterMemo } from '@/component/footer'
import { type HeaderSection } from '@/component/header'
import { BottomNavMemo, HeaderMemo } from '@/component/header/component'
import { logosPerRowOf } from '@/component/listing'
import { tooltipLayerView } from '@/component/tooltip'
import { TooltipDispatchContext } from '@/component/tooltip/context'
import { AboutMemo } from '@/screen/about-screen/component'
import { AdjacentMemo } from '@/screen/adjacent-screen/component'
import { BuildMemo } from '@/screen/build-screen/component'
import { CatalogMemo } from '@/screen/catalog-screen/component'
import { FrameworkMemo } from '@/screen/framework-screen/component'
import { NotFoundMemo } from '@/screen/not-found-screen/component'
import { RubricMemo } from '@/screen/rubric-screen/component'
import { type Model, type Msg, type ScreenModel } from '@/type'
import { listDestinationOf } from '@/util'

const headerSectionOf = (screenModel: ScreenModel): HeaderSection => {
  switch (screenModel._tag) {
    case 'CatalogScreenModel':
      return 'catalog'
    case 'FrameworkScreenModel':
      // The page of an entry belongs to its list
      return listOf(screenModel.model.framework)
    case 'RubricScreenModel':
      return 'rubric'
    case 'AboutScreenModel':
      return 'about'
    case 'AdjacentScreenModel':
      return 'adjacent'
    case 'BuildScreenModel':
      return 'build'
    case 'NotFoundScreenModel':
      return 'none'
  }
}

// The two lists (the catalog and TEA-adjacent) take the full width for
// their cards and table; every other page reads in a narrower column
const isListScreen = (screenModel: ScreenModel): boolean =>
  screenModel._tag === 'CatalogScreenModel' ||
  screenModel._tag === 'AdjacentScreenModel'

const screenView = ({
  model,
  dispatch,
}: {
  model: Model
  dispatch: Dispatcher<Msg>
}) => {
  const { screenModel } = model
  switch (screenModel._tag) {
    case 'CatalogScreenModel':
      return (
        <CatalogMemo
          model={model.catalog}
          logosPerRow={logosPerRowOf(model.windowWidth)}
          dispatch={(subMsg) => dispatch({ _tag: 'CatalogScreenMsg', subMsg })}
        />
      )
    case 'FrameworkScreenModel':
      return (
        <FrameworkMemo
          model={screenModel.model}
          listDestination={listDestinationOf(
            model,
            listOf(screenModel.model.framework),
          )}
        />
      )
    case 'RubricScreenModel':
      return (
        <RubricMemo
          model={screenModel.model}
          dispatch={(subMsg) => dispatch({ _tag: 'RubricScreenMsg', subMsg })}
        />
      )
    case 'AboutScreenModel':
      return (
        <AboutMemo
          model={screenModel.model}
          dispatch={(subMsg) => dispatch({ _tag: 'AboutScreenMsg', subMsg })}
        />
      )
    case 'AdjacentScreenModel':
      return (
        <AdjacentMemo
          model={model.adjacent}
          logosPerRow={logosPerRowOf(model.windowWidth)}
          dispatch={(subMsg) => dispatch({ _tag: 'AdjacentScreenMsg', subMsg })}
        />
      )
    case 'BuildScreenModel':
      return (
        <BuildMemo
          model={screenModel.model}
          dispatch={(subMsg) => dispatch({ _tag: 'BuildScreenMsg', subMsg })}
        />
      )
    case 'NotFoundScreenModel':
      return <NotFoundMemo />
  }
}

// Scrolls to where the move drew the screen shown (`Model.scroll`), once
// per move: after React has drawn that screen, so the page is already as
// tall as it, and before the browser paints it, so its first frame is at
// its place (a list never flashes at the top before its scroll comes back)
const useScrollOf = (scroll: Model['scroll']) => {
  useLayoutEffect(() => {
    window.scrollTo({ top: scroll.top })
  }, [scroll.seq, scroll.top])
}

export const App = ({
  model,
  dispatch,
}: {
  model: Model
  dispatch: Dispatcher<Msg>
}) => {
  useScrollOf(model.scroll)
  return (
    <SetGlobalMsgContext value={dispatch}>
      <TooltipDispatchContext value={dispatch}>
        {/* On a phone the page leaves room at the bottom for the tab bar */}
        <div className='bg-page text-ink flex min-h-dvh flex-col pb-[60px] lg:pb-0'>
          <HeaderMemo
            active={headerSectionOf(model.screenModel)}
            now={model.now}
          />
          <main className='flex flex-1 justify-center px-[16px] py-[32px] lg:py-[48px]'>
            <div
              className={cn(
                'w-full',
                isListScreen(model.screenModel)
                  ? 'max-w-[1080px]'
                  : 'max-w-[860px]',
              )}
            >
              {screenView({ model, dispatch })}
            </div>
          </main>
          <FooterMemo />
          <BottomNavMemo active={headerSectionOf(model.screenModel)} />
          {backToTopView({
            model: model.backToTop,
            dispatch: (subMsg) => dispatch({ _tag: 'BackToTopMsg', subMsg }),
          })}
          {/* The one tooltip of the app, fixed over the page */}
          {tooltipLayerView({ model: model.tooltip })}
        </div>
      </TooltipDispatchContext>
    </SetGlobalMsgContext>
  )
}
