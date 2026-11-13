import { IconExternalLink, IconHeartFilled } from '@tabler/icons-react'
import { memo } from 'react'

import { adjacentEntries, frameworks } from '@/common/data/catalog'
import {
  aboutScreen,
  adjacentScreen,
  buildScreen,
  catalogScreen,
  destinationOfScreen,
  rubricScreen,
} from '@/common/type/destination'
import { languagesOf } from '@/common/type/framework'

import { emblemView } from './emblem'
import { lastUpdated } from './header'
import { Link } from './link'

// The year of the build, for the copyright line
const YEAR = new Date().getFullYear()

// The languages of the catalog, counted once each
const languageCount = new Set(frameworks.flatMap(languagesOf)).size

const footerHeadingView = ({ title }: { title: string }) => (
  <h2 className='text-ink text-xs tracking-wider uppercase'>{title}</h2>
)

const footerLinkClass =
  'text-ink-muted hover:text-accent inline-flex items-center gap-[4px] text-sm transition-colors'

const externalLinkView = ({ href, label }: { href: string; label: string }) => (
  <li>
    <a href={href} target='_blank' rel='noreferrer' className={footerLinkClass}>
      {label}
      <IconExternalLink size={13} stroke={1.75} aria-hidden />
    </a>
  </li>
)

const statChipView = ({ label }: { label: string }) => (
  <span className='border-line bg-field text-ink-muted inline-flex items-center rounded-[2px] border px-[8px] py-[2px] text-xs tabular-nums'>
    {label}
  </span>
)

// The foot of every page: what the site is and how big, its pages and its
// source code, where to learn TEA and what the site draws on, then the
// year, a note that it is a community catalog, and who made it and with
// what. It takes no props, so it is drawn once.
const FooterComponent = () => (
  <footer className='border-line bg-panel border-t'>
    <div className='flex justify-center px-[16px]'>
      <div className='flex w-full max-w-[1080px] flex-col gap-[32px] py-[40px]'>
        <div className='grid grid-cols-2 gap-[32px] lg:grid-cols-5'>
          <div className='col-span-2 flex flex-col gap-[12px]'>
            <span className='text-ink flex items-center gap-[10px]'>
              {emblemView({ size: 24 })}
              <span className='text-lg'>TEA Ecosystem</span>
            </span>
            <p className='text-ink-muted max-w-[420px] text-sm'>
              Every language and framework that implements The Elm Architecture,
              graded part by part against Elm, so you can see what each
              ecosystem has and what it could bring back.
            </p>
            <div className='flex flex-wrap gap-[6px]'>
              {statChipView({ label: `${frameworks.length} entries` })}
              {statChipView({ label: `${languageCount} languages` })}
              {statChipView({
                label: `${adjacentEntries.length} TEA-adjacent`,
              })}
            </div>
          </div>

          <nav className='flex flex-col gap-[12px]' aria-label='Pages'>
            {footerHeadingView({ title: 'Pages' })}
            <ul className='flex flex-col gap-[8px]'>
              <li>
                <Link
                  destination={destinationOfScreen(catalogScreen())}
                  className={footerLinkClass}
                >
                  Catalog
                </Link>
              </li>
              <li>
                <Link
                  destination={destinationOfScreen(aboutScreen())}
                  className={footerLinkClass}
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  destination={destinationOfScreen(rubricScreen())}
                  className={footerLinkClass}
                >
                  Rubric
                </Link>
              </li>
              <li>
                <Link
                  destination={destinationOfScreen(adjacentScreen())}
                  className={footerLinkClass}
                >
                  TEA-adjacent
                </Link>
              </li>
              <li>
                <Link
                  destination={destinationOfScreen(buildScreen())}
                  className={footerLinkClass}
                >
                  Build your own TEA
                </Link>
              </li>
              {externalLinkView({
                href: 'https://github.com/rinn7e/tea-ecosystem',
                label: 'Source code',
              })}
            </ul>
          </nav>

          <div className='flex flex-col gap-[12px]'>
            {footerHeadingView({ title: 'Learn TEA' })}
            <ul className='flex flex-col gap-[8px]'>
              {externalLinkView({
                href: 'https://guide.elm-lang.org/architecture/',
                label: 'The Elm Architecture',
              })}
              {externalLinkView({
                href: 'https://elm-lang.org/',
                label: 'elm-lang.org',
              })}
            </ul>
          </div>

          <div className='flex flex-col gap-[12px]'>
            {footerHeadingView({ title: 'Credits' })}
            <ul className='flex flex-col gap-[8px]'>
              {externalLinkView({
                href: 'https://simpleicons.org/',
                label: 'Simple Icons (CC0)',
              })}
              {externalLinkView({
                href: 'https://devicon.dev/',
                label: 'Devicon (MIT)',
              })}
              {externalLinkView({
                href: 'https://highlightjs.org/',
                label: 'highlight.js',
              })}
            </ul>
          </div>
        </div>

        {/* The bottom bar on the axis: the year, the note, the credit */}
        <div className='border-line text-ink-faint flex flex-col items-center gap-[8px] border-t pt-[24px] text-center text-xs'>
          <p>
            © {YEAR} TEA Ecosystem, updated {lastUpdated}
          </p>
          <p className='max-w-[620px] text-balance'>
            A community catalog, not affiliated with Elm. Each framework logo
            belongs to its own project. Some grades were drafted from memory and
            a light web check; each framework page says which. Corrections are
            welcome.
          </p>
          <p className='inline-flex flex-wrap items-center justify-center gap-[4px]'>
            Crafted with
            <IconHeartFilled size={12} className='text-missing' aria-hidden />
            by rinn7e, built with
            <a
              href='https://github.com/vankeisb/react-tea-cup'
              target='_blank'
              rel='noreferrer'
              className='hover:text-accent inline-flex items-center gap-[2px] underline underline-offset-2 transition-colors'
            >
              react-tea-cup
              <IconExternalLink size={12} stroke={1.75} aria-hidden />
            </a>
          </p>
        </div>
      </div>
    </div>
  </footer>
)

export const FooterMemo = memo(FooterComponent)
