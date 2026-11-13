import { cn } from '@rinn7e/tea-cup-prelude'
import {
  IconBrandGithub,
  IconCirclesRelation,
  IconHammer,
  IconInfoCircle,
  IconListCheck,
} from '@tabler/icons-react'

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
import { dayMonthYearOf } from '@/common/util'

import { Link } from './link'
import { TooltipTrigger } from './tooltip/trigger'

// The day the repository last changed, as the bar and the footer show it
export const lastUpdated = dayMonthYearOf(LAST_UPDATED)

export type HeaderSection =
  'catalog' | 'about' | 'rubric' | 'adjacent' | 'build' | 'none'

// A square cut into pieces, mirrored on the axis x = 16: a big triangle (a
// cup) over a diamond (its foot), with triangles around them. The pieces
// sit 2 units apart, so the bar shows through the cuts. They are drawn in
// `currentColor`, the white of the bar text, in both modes
export const emblemView = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 32 32'
    fill='currentColor'
    aria-hidden='true'
  >
    <path d='M2.41 1L29.59 1L16 14.59Z' />
    <path d='M16 17.41L22.59 24L16 30.59L9.41 24Z' />
    <path d='M1 2.41L13.59 15L1 15Z' />
    <path d='M31 15L18.41 15L31 2.41Z' />
    <path d='M1 17L13.59 17L1 29.59Z' />
    <path d='M31 29.59L18.41 17L31 17Z' />
    <path d='M2.41 31L8 25.41L13.59 31Z' />
    <path d='M18.41 31L24 25.41L29.59 31Z' />
  </svg>
)

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
// links move to the tab bar at the bottom (`bottomNavView`).
//
// The emblem on the axis is the link to the catalog. The link of the page
// shown is underlined, but the emblem shows it by its opacity instead: full
// on the catalog, dimmed elsewhere. Like every link of the bars and the
// footer, it opens its list fresh (no filters, cards, the top of the
// page); only going back (the link back of an entry page, or the back of
// the browser) shows a list as it was left. The about page and the guide
// face it from the left, the adjacent page and the rubric from the right.
//
// The source code of the site is linked at the end of the right column on
// a desktop (the right edge of the frame), and pinned to the right edge of
// the bar on a phone; neither moves the emblem off the axis
export const headerView = ({ active }: { active: HeaderSection }) => (
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
        {/* The right column: its links, then the source code at the end of
            the frame. On a phone the wrapper adds no box (\`contents\`): the
            links hide and the source code is pinned to the right edge */}
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
          {/* The source code, with the day it last changed under the icon */}
          <TooltipTrigger
            id='bar-last-updated'
            content={{
              title: `Updated ${lastUpdated}`,
              text: 'The day the catalog or the site last changed, in its repository on GitHub. The site is rebuilt on every change.',
            }}
            touch={false}
            className='absolute top-1/2 right-[16px] flex -translate-y-1/2 lg:static lg:translate-y-0'
          >
            <a
              href='https://github.com/rinn7e/tea-ecosystem'
              target='_blank'
              rel='noreferrer'
              aria-label={`The source code of TEA Ecosystem on GitHub, updated ${lastUpdated}`}
              className='text-bar-ink flex cursor-pointer flex-col items-center gap-[3px] px-[4px] py-[2px] opacity-80 transition-opacity hover:opacity-100'
            >
              <IconBrandGithub size={22} stroke={1.75} aria-hidden />
              <span className='text-[0.625rem] leading-none whitespace-nowrap tabular-nums'>
                {lastUpdated}
              </span>
            </a>
          </TooltipTrigger>
        </div>
      </div>
    </div>
  </header>
)

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
    className={cn(
      'flex flex-col items-center justify-center gap-[2px] border-t-2 text-[0.6875rem] transition-colors',
      isActive
        ? 'border-accent text-accent'
        : 'text-ink-muted hover:text-accent border-transparent',
    )}
  >
    {icon}
    {label}
  </Link>
)

// The tab bar of a phone, fixed to the bottom of the screen: the links of
// the top bar in the same order, each an icon over its name, the emblem
// (the catalog) on the axis. The tab of the page shown is blue with a blue
// edge on top. Hidden from the `lg` width up, where the top bar has them.
export const bottomNavView = ({ active }: { active: HeaderSection }) => (
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
