import { cn } from '@rinn7e/tea-cup-prelude'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

import {
  type LanguageLogo,
  languageLogoOf,
  monogramOf,
} from '@/common/data/language-logo'
import { BASE_URL } from '@/common/env'
import {
  type Framework,
  type LogoPadding,
  isLanguageEntry,
  languagesOf,
} from '@/common/type/framework'

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
          loading='lazy'
          decoding='async'
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

// A card on a phone (below `sm:`) takes the tile of a table row, so
// more cards fit on the screen
const tileClass = (size: TileSize): string => {
  switch (size) {
    case 'chip':
      return 'size-[26px]'
    case 'row':
      return 'size-[36px]'
    case 'card':
      return 'size-[36px] sm:size-[44px]'
    case 'page':
      return 'size-[72px]'
  }
}

// A glyph (`logoText`, such as the cup of react-tea-cup)
const tileGlyphClass = (size: TileSize): string => {
  switch (size) {
    case 'chip':
      return 'text-[0.6875rem]'
    case 'row':
      return 'text-[0.9375rem]'
    case 'card':
      return 'text-[0.9375rem] sm:text-[1.125rem]'
    case 'page':
      return 'text-[1.875rem]'
  }
}

const tileLanguageLogoClass = (size: TileSize): string => {
  switch (size) {
    case 'chip':
      return 'size-[16px]'
    case 'row':
      return 'size-[22px]'
    case 'card':
      return 'size-[22px] sm:size-[26px]'
    case 'page':
      return 'size-[42px]'
  }
}

// A share of the tile: padding in percent counts from the width of the
// tile, which holds the image
const logoPaddingClass = (padding: LogoPadding): string => {
  switch (padding) {
    case 'small':
      return 'p-[6%]'
    case 'medium':
      return 'p-[12%]'
    case 'large':
      return 'p-[18%]'
  }
}

// The font size of a striped tile, which only sets the scale of its
// stripes (sized in `em`): about three and a half across a tile of any size
const tileStripesClass = (size: TileSize): string => {
  switch (size) {
    case 'chip':
      return 'text-[0.75rem]'
    case 'row':
      return 'text-[1.0625rem]'
    case 'card':
      return 'text-[1.0625rem] sm:text-[1.3125rem]'
    case 'page':
      return 'text-[2.125rem]'
  }
}

const logoUrl = (file: string): string =>
  `${BASE_URL.replace(/\/$/, '')}/logo/${file}`

// One frame for every tile (its own logo, the logo of its language, a
// glyph or two letters), in the panel and the ink of the mode, so a dark
// page shows no white square: a logo file is drawn as it is, its own
// background included. The one exception: a logo drawn in dark ink on a
// transparent ground (`logoOnLight`) keeps a white tile, or it would vanish
// on the dark panel.
// The logo of the language of an entry, in its tile. An entry in two
// languages (Kotlin and Swift) shows both, the second in front at the
// bottom right, on the color of the panel so it reads as laid over the
// first; each is a share of the tile, so the pair keeps its shape at
// every tile size.
const languageMarksView = ({
  framework,
  size,
}: {
  framework: Framework
  size: TileSize
}) => {
  const [first = framework.language, second] = languagesOf(framework)
  return pipe(
    O.Do,
    O.apS('back', languageLogoOf(first)),
    O.apS('front', pipe(O.fromNullable(second), O.chain(languageLogoOf))),
    O.fold(
      () =>
        pipe(
          languageLogoOf(first),
          O.fold(
            () =>
              languageLogoView({ language: framework.language, size: 'large' }),
            (logo) =>
              languageMarkView({
                logo,
                className: tileLanguageLogoClass(size),
              }),
          ),
        ),
      ({ back, front }) => (
        <span className='relative size-[74%]'>
          <span className='absolute top-0 left-0 flex size-[60%]'>
            {languageMarkView({ logo: back, className: 'size-full' })}
          </span>
          <span className='bg-panel absolute right-0 bottom-0 flex size-[66%] rounded-[3px] p-[8%]'>
            {languageMarkView({ logo: front, className: 'size-full' })}
          </span>
        </span>
      ),
    ),
  )
}

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
      <span
        className={cn(
          frame,
          framework.logoOnLight === true ? 'bg-light-tile' : 'bg-panel',
        )}
      >
        <img
          src={logoUrl(framework.logo)}
          alt=''
          loading='lazy'
          decoding='async'
          className={cn(
            'size-full object-contain',
            pipe(
              O.fromNullable(framework.logoPadding),
              O.fold(() => '', logoPaddingClass),
            ),
          )}
        />
      </span>
    )
  } else if (framework.logoText !== undefined) {
    return (
      <span
        aria-hidden='true'
        className={cn(frame, tileGlyphClass(size), 'bg-panel text-ink')}
      >
        {framework.logoText}
      </span>
    )
  } else {
    // A language entry (Elm) shows its own logo; any other entry with no
    // logo shows the logo of its language (the first of two) on stripes,
    // so it reads as standing in for a logo
    return (
      <span
        aria-hidden='true'
        className={cn(
          frame,
          'bg-panel text-ink',
          !isLanguageEntry(framework) &&
            cn('pattern-stripes', tileStripesClass(size)),
        )}
      >
        {languageMarksView({ framework, size })}
      </span>
    )
  }
}

// Whether the tile of an entry already shows the logo of its language: a
// language entry (Elm), or an entry with no logo of its own
const tileShowsLanguage = (framework: Framework): boolean =>
  isLanguageEntry(framework) ||
  (framework.logo === undefined && framework.logoText === undefined)

// The logo beside the language line ("Rust framework") of an entry next
// to its tile; none when the tile shows it already
export const languageLineLogoView = ({
  framework,
  size,
}: {
  framework: Framework
  size: LogoSize
}) =>
  tileShowsLanguage(framework)
    ? null
    : languageLogoView({ language: framework.language, size })
