import { cn } from '@rinn7e/tea-cup-prelude'
import {
  IconCirclesRelation,
  IconCode,
  IconHammer,
  IconInfoCircle,
  IconListCheck,
} from '@tabler/icons-react'
import { memo } from 'react'

import { LAST_UPDATED } from '@/common/env'
import {
  type Destination,
  aboutScreen,
  adjacentScreen,
  buildScreen,
  catalogScreen,
  destinationOfScreen,
  rubricScreen,
} from '@/common/type/destination'
import { relativeTimeOf } from '@/common/util'
import { emblemView } from '@/component/emblem'
import { Link } from '@/component/link'
import { TooltipTrigger } from '@/component/tooltip/trigger'

import {
  type BottomNavProps,
  BottomNavPropsEq,
  type HeaderProps,
  HeaderPropsEq,
} from './type'
import { lastUpdated } from './util'

// Every link has one width (the longest label, build your own, sets it),
// so the two sides of the emblem balance
const navLinkView = ({
  label,
  destination,
  isActive,
}: {
  label: string
  destination: Destination
  isActive: boolean
}) => (
  <Link
    destination={destination}
    aria-current={isActive ? 'page' : undefined}
    className={cn(
      'text-bar-ink w-[128px] border-b-2 pt-[4px] pb-[2px] text-center text-base whitespace-nowrap transition-colors',
      isActive
        ? 'border-bar-ink'
        : 'hover:border-bar-ink/50 border-transparent',
    )}
  >
    {label}
  </Link>
)

// On a phone the bar shows only the emblem and the name, centred, and the
// links move to the tab bar at the bottom (`BottomNavMemo`).
//
// The link of the page shown is underlined, but the emblem (the link to the
// catalog) shows it by its opacity instead, from `lg` up: full on the
// catalog, dimmed elsewhere. Like every link of the bars and the footer, it opens its list
// fresh (no filters, cards, the top of the page); only going back (the link
// back of an entry page, or the back of the browser) shows a list as it was
// left.
//
// The source code of the site is linked at the end of the right column on
// a desktop (the right edge of the frame), and pinned to the right edge of
// the bar on a phone, so neither moves the emblem off the axis.
const HeaderComponent = ({ active, now }: HeaderProps) => (
  <header className='bg-bar relative'>
    <div className='flex justify-center px-[16px]'>
      <div className='flex h-[64px] w-full max-w-[1080px] items-center justify-center gap-[4px] lg:grid lg:grid-cols-[1fr_auto_1fr]'>
        <nav className='hidden justify-end gap-[2px] lg:flex'>
          {navLinkView({
            label: 'about',
            destination: destinationOfScreen(aboutScreen()),
            isActive: active === 'about',
          })}
          {navLinkView({
            label: 'build your own',
            destination: destinationOfScreen(buildScreen()),
            isActive: active === 'build',
          })}
        </nav>
        <Link
          destination={destinationOfScreen(catalogScreen())}
          aria-label='TEA Ecosystem, the catalog'
          aria-current={active === 'catalog' ? 'page' : undefined}
          className={cn(
            'text-bar-ink flex items-center gap-[14px] px-[8px] py-[6px] transition-opacity lg:px-[28px]',
            active === 'catalog'
              ? 'opacity-100'
              : 'opacity-100 lg:opacity-70 lg:hover:opacity-100',
          )}
        >
          {emblemView({ size: 28 })}
          <span className='text-[1.375rem] leading-none whitespace-nowrap lg:text-[1.625rem]'>
            TEA Ecosystem
          </span>
        </Link>
        {/* On a phone the wrapper adds no box (`contents`): the links hide
            and the source code is pinned to the right edge */}
        <div className='contents lg:flex lg:items-center lg:justify-between'>
          <nav className='hidden justify-start gap-[2px] lg:flex'>
            {navLinkView({
              label: 'TEA-adjacent',
              destination: destinationOfScreen(adjacentScreen()),
              isActive: active === 'adjacent',
            })}
            {navLinkView({
              label: 'rubric',
              destination: destinationOfScreen(rubricScreen()),
              isActive: active === 'rubric',
            })}
          </nav>
          <TooltipTrigger
            id='bar-last-updated'
            content={{
              title: `Updated ${relativeTimeOf(LAST_UPDATED, now)}`,
              text: `The catalog or the site last changed on ${lastUpdated}, in its repository on GitHub. The site is rebuilt on every change.`,
            }}
            touch={false}
            className='absolute top-1/2 right-[16px] flex -translate-y-1/2 lg:static lg:translate-y-0'
          >
            <a
              href='https://github.com/rinn7e/tea-ecosystem'
              target='_blank'
              rel='noreferrer'
              aria-label={`The source code of TEA Ecosystem on GitHub, updated ${relativeTimeOf(LAST_UPDATED, now)}`}
              className='text-bar-ink group flex cursor-pointer flex-col items-center gap-[2px] px-[4px] py-[2px] opacity-80 transition-opacity hover:opacity-100'
            >
              {/* The icon alone is quieter, so the time under it stays as readable */}
              <IconCode
                size={18}
                stroke={1.75}
                aria-hidden
                className='opacity-75 transition-opacity group-hover:opacity-100'
              />
              {/* The compact form on a phone, where the emblem leaves
                  little room on its right; the words from a tablet up */}
              <span className='text-[0.625rem] leading-none whitespace-nowrap tabular-nums'>
                <span className='tablet:hidden'>
                  {relativeTimeOf(LAST_UPDATED, now, true)}
                </span>
                <span className='tablet:inline hidden'>
                  {relativeTimeOf(LAST_UPDATED, now)}
                </span>
              </span>
            </a>
          </TooltipTrigger>
        </div>
      </div>
    </div>
  </header>
)

export const HeaderMemo = memo(HeaderComponent, HeaderPropsEq.equals)

// The icon of a tab grows and settles back on each tap, also on the tab
// already shown, as the tab bars of phone apps do: a feedback that the tap
// landed when the page does not change. One run of a transform, not a
// state of the model, and none under reduced motion.
const popIconOf = (e: React.MouseEvent<HTMLAnchorElement>) => {
  const icon = e.currentTarget.querySelector('[data-tab-icon]')
  if (
    icon !== null &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    icon.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.18)', offset: 0.4 },
        { transform: 'scale(1)' },
      ],
      { duration: 260, easing: 'ease-out' },
    )
  }
}

const bottomTabView = ({
  label,
  icon,
  destination,
  isActive,
}: {
  label: string
  icon: React.ReactNode
  destination: Destination
  isActive: boolean
}) => (
  <Link
    destination={destination}
    aria-current={isActive ? 'page' : undefined}
    onClick={popIconOf}
    className={cn(
      'flex flex-col items-center justify-center gap-[2px] border-t-2 text-[0.6875rem] transition-colors',
      isActive
        ? 'border-accent text-accent'
        : 'text-ink-muted hover:text-accent border-transparent',
    )}
  >
    <span data-tab-icon className='flex'>
      {icon}
    </span>
    {label}
  </Link>
)

// The links of the top bar in the same order, the emblem (the catalog) on
// the axis. Hidden from the `lg` width up, where the top bar has them.
const BottomNavComponent = ({ active }: BottomNavProps) => (
  <nav
    aria-label='Pages'
    className='border-line bg-panel fixed inset-x-0 bottom-0 z-30 grid h-[60px] grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] lg:hidden'
  >
    {bottomTabView({
      label: 'about',
      icon: <IconInfoCircle size={22} stroke={1.75} aria-hidden />,
      destination: destinationOfScreen(aboutScreen()),
      isActive: active === 'about',
    })}
    {bottomTabView({
      label: 'build',
      icon: <IconHammer size={22} stroke={1.75} aria-hidden />,
      destination: destinationOfScreen(buildScreen()),
      isActive: active === 'build',
    })}
    {bottomTabView({
      label: 'catalog',
      icon: emblemView({ size: 22 }),
      destination: destinationOfScreen(catalogScreen()),
      isActive: active === 'catalog',
    })}
    {bottomTabView({
      label: 'adjacent',
      icon: <IconCirclesRelation size={22} stroke={1.75} aria-hidden />,
      destination: destinationOfScreen(adjacentScreen()),
      isActive: active === 'adjacent',
    })}
    {bottomTabView({
      label: 'rubric',
      icon: <IconListCheck size={22} stroke={1.75} aria-hidden />,
      destination: destinationOfScreen(rubricScreen()),
      isActive: active === 'rubric',
    })}
  </nav>
)

export const BottomNavMemo = memo(BottomNavComponent, BottomNavPropsEq.equals)
