import { cn } from '@rinn7e/tea-cup-prelude'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

import {
  type LanguageLogo,
  languageLogoOf,
  monogramOf,
} from '@/common/data/language-logo'
import { BASE_URL } from '@/common/env'
import { type Framework, isLanguageEntry } from '@/common/type/framework'

export type LogoSize = 'small' | 'large'

const languageMarkView = ({
  logo,
  className,
}: {
  logo: LanguageLogo
  className: string
}) => {
  switch (logo._tag) {
    case 'Shapes':
      return (
        <svg
          role='img'
          aria-label={logo.title}
          viewBox={logo.viewBox}
          className={className}
        >
          {logo.paths.map((path) => (
            <path
              key={path.d}
              d={path.d}
              fill={path.fill}
              stroke={path.stroke}
              strokeWidth={path.strokeWidth}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          ))}
        </svg>
      )
    case 'Image':
      return (
        <img
          src={logoUrl(logo.file)}
          alt={logo.title}
          className={cn(className, 'object-contain')}
        />
      )
  }
}

export const languageLogoView = ({
  language,
  size,
}: {
  language: string
  size: LogoSize
}) =>
  pipe(
    languageLogoOf(language),
    O.fold(
      () => (
        <span
          aria-hidden='true'
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-[2px] border border-current leading-none',
            size === 'small'
              ? 'size-[16px] text-[0.5625rem]'
              : 'size-[22px] text-[0.75rem]',
          )}
        >
          {monogramOf(language)}
        </span>
      ),
      (logo) =>
        languageMarkView({
          logo,
          className: cn(
            'shrink-0',
            size === 'small' ? 'size-[16px]' : 'size-[22px]',
          ),
        }),
    ),
  )

export type TileSize = 'chip' | 'row' | 'card' | 'page'

const tileClass = (size: TileSize): string => {
  switch (size) {
    case 'chip':
      return 'size-[26px] text-[0.6875rem]'
    case 'row':
      return 'size-[36px] text-[0.9375rem]'
    case 'card':
      return 'size-[44px] text-[1.125rem]'
    case 'page':
      return 'size-[72px] text-[1.875rem]'
  }
}

const tileLanguageLogoClass = (size: TileSize): string => {
  switch (size) {
    case 'chip':
      return 'size-[16px]'
    case 'row':
      return 'size-[22px]'
    case 'card':
      return 'size-[26px]'
    case 'page':
      return 'size-[42px]'
  }
}

const logoUrl = (file: string): string =>
  `${BASE_URL.replace(/\/$/, '')}/logo/${file}`

// One frame for every tile (its own logo, the logo of its language or two
// letters), white in both modes like the logo files, so the list stays even.
export const frameworkTileView = ({
  framework,
  size,
}: {
  framework: Framework
  size: TileSize
}) => {
  const frame = cn(
    'border-line inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[3px] border leading-none',
    tileClass(size),
  )
  if (framework.logo !== undefined) {
    return (
      <span className={cn(frame, 'bg-tile')}>
        <img
          src={logoUrl(framework.logo)}
          alt=''
          className='size-full object-contain'
        />
      </span>
    )
  } else if (framework.logoText !== undefined) {
    return (
      <span aria-hidden='true' className={cn(frame, 'bg-tile text-tile-ink')}>
        {framework.logoText}
      </span>
    )
  } else {
    return pipe(
      isLanguageEntry(framework) ? languageLogoOf(framework.language) : O.none,
      O.fold(
        () => (
          <span
            aria-hidden='true'
            className={cn(frame, 'bg-tile text-tile-ink font-semibold')}
          >
            {monogramOf(framework.name)}
          </span>
        ),
        (logo) => (
          <span className={cn(frame, 'bg-tile text-tile-ink')}>
            {languageMarkView({
              logo,
              className: tileLanguageLogoClass(size),
            })}
          </span>
        ),
      ),
    )
  }
}

// A language entry (Elm) shows its logo in its tile already, not here.
export const languageLineLogoView = ({
  framework,
  size,
}: {
  framework: Framework
  size: LogoSize
}) =>
  isLanguageEntry(framework)
    ? null
    : languageLogoView({ language: framework.language, size })
