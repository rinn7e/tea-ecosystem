import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { type ReactNode } from 'react'

import { type Entries } from '@/common/data/catalog'
import { languageLogoOf } from '@/common/data/language-logo/logo'
import { type LogoPath } from '@/common/data/language-logo/path'
import { type SitePage, pageHeadingOf } from '@/common/data/page-heading'
import {
  type Concept,
  type Framework,
  type Status,
  concepts,
  languagesOf,
} from '@/common/type/framework'
import { starCountOf } from '@/common/util/number'
import {
  type ShownGrade,
  conceptLabel,
  gradeLabel,
  languageLineOf,
  shownGradeOf,
  statusLabel,
  tierLabel,
} from '@/component/framework-view'
import { languageCountsOf } from '@/component/listing/util'

// The link preview of every page (`og:image`): a card of 1200 x 630 in the
// light look of the site, drawn at build time with satori and resvg
// (`scripts/prerender.mjs`), so a link shared on Facebook, Reddit, Slack
// or X shows what it leads to. The page of an entry shows the entry
// (`shareCardOf`), every other page its heading (`pageCardOf`), in one
// frame. Satori lays out a subset of CSS with flexbox only, so every box
// here says `display: flex`.

export const SHARE_CARD_WIDTH = 1200
export const SHARE_CARD_HEIGHT = 630

// The light colors of `src/asset/index.css`
const color = {
  page: '#ffffff',
  field: '#f3f8fc',
  line: '#d3d3d3',
  ink: '#000e16',
  inkMuted: '#4b5560',
  inkFaint: '#6e7072',
  accent: '#0b7bbe',
  native: '#1a7d11',
  managed: '#167a84',
  equivalent: '#8f6b00',
  missing: '#c23621',
  starInk: '#9a6700',
  star: '#e3b341',
}

// The logo the card draws: a file of `public/logo/` (or of a language), read
// by the build, or the shapes of a language logo drawn here
export type ShareLogo =
  | { _tag: 'File'; file: string }
  | { _tag: 'Shapes'; viewBox: string; paths: LogoPath[] }

const languageShareLogoOf = (language: string): O.Option<ShareLogo> =>
  pipe(
    languageLogoOf(language),
    O.map((logo): ShareLogo =>
      logo._tag === 'Image'
        ? { _tag: 'File', file: logo.file }
        : { _tag: 'Shapes', viewBox: logo.viewBox, paths: logo.paths },
    ),
  )

// Its own logo, else the logo of its first language. A glyph (`logoText`,
// an emoji) needs a font of its own, so the language stands in for it too.
export const shareLogoOf = (framework: Framework): O.Option<ShareLogo> =>
  framework.logo !== undefined
    ? O.some({ _tag: 'File', file: framework.logo })
    : pipe(A.head(languagesOf(framework)), O.chain(languageShareLogoOf))

// The shapes of a language logo as an SVG document, for an `img`
export const svgOfShapes = (viewBox: string, paths: LogoPath[]): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${paths
    .map(
      (path) =>
        `<path d="${path.d}" fill="${path.fill}"${path.stroke !== undefined ? ` stroke="${path.stroke}" stroke-width="${path.strokeWidth ?? 1}" stroke-linecap="round" stroke-linejoin="round"` : ''}/>`,
    )
    .join('')}</svg>`

const gradeColor = (grade: ShownGrade): string => {
  switch (grade) {
    case 'native':
      return color.native
    case 'managed':
      return color.managed
    case 'equivalent':
      return color.equivalent
    case 'missing':
      return color.missing
    case 'none':
      return color.inkFaint
  }
}

const statusColor = (status: Status): string =>
  status === 'active'
    ? color.native
    : status === 'quiet'
      ? color.equivalent
      : color.missing

// The star of the star count, in the gold of the site (the filled star of
// Tabler Icons, MIT)
export const STAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color.star}" d="M8.243 7.34l-6.38 .925l-.113 .023a1 1 0 0 0 -.44 1.684l4.622 4.499l-1.09 6.355l-.013 .11a1 1 0 0 0 1.464 .944l5.706 -3l5.693 3l.1 .046a1 1 0 0 0 1.352 -1.1l-1.091 -6.355l4.624 -4.5l.078 -.085a1 1 0 0 0 -.633 -1.62l-6.38 -.926l-2.852 -5.78a1 1 0 0 0 -1.794 0l-2.853 5.78z"/></svg>`

// A color with an alpha, as the chips of the site tint their grade
const tint = (hex: string, alpha: number): string =>
  `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`

const chipView = (label: string, grade: ShownGrade) => (
  <div
    key={label}
    style={{
      display: 'flex',
      padding: '6px 16px',
      borderRadius: 4,
      border: `2px solid ${grade === 'none' ? color.line : tint(gradeColor(grade), 0.4)}`,
      background: grade === 'none' ? color.field : tint(gradeColor(grade), 0.1),
      color: gradeColor(grade),
      fontSize: 26,
    }}
  >
    {label}
  </div>
)

const chipsView = (chips: ReactNode[]) => (
  <div style={{ display: 'flex', gap: 10 }}>{chips}</div>
)

// The frame both cards share: the blue bar, the tile and the title with
// the line under it, a strip, the lead, and the site at the foot
const frameView = ({
  tile,
  title,
  subline,
  strip,
  lead,
  leadLines,
  footNote,
  emblemSrc,
}: {
  tile: ReactNode
  title: string
  subline: ReactNode
  strip: ReactNode
  lead: string
  leadLines: number
  footNote: ReactNode
  emblemSrc: string
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      width: SHARE_CARD_WIDTH,
      height: SHARE_CARD_HEIGHT,
      // The padding and the bar inside the size: satori counts them out
      boxSizing: 'border-box',
      padding: '56px 64px',
      background: color.page,
      fontFamily: 'IBM Plex Sans',
      color: color.ink,
      borderTop: `10px solid ${color.accent}`,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 168,
          height: 168,
          flexShrink: 0,
          border: `2px solid ${color.line}`,
          borderRadius: 8,
          background: color.page,
          padding: 16,
        }}
      >
        {tile}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 500 }}>
          {title}
        </div>
        {subline}
      </div>
    </div>
    <div style={{ display: 'flex', marginTop: 34 }}>{strip}</div>
    <div
      style={{
        display: 'block',
        marginTop: 24,
        fontSize: leadLines > 2 ? 26 : 32,
        lineHeight: 1.4,
        color: color.inkMuted,
        lineClamp: leadLines,
      }}
    >
      {lead}
    </div>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <img src={emblemSrc} width={44} height={44} />
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 500 }}>
          TEA Ecosystem
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: color.accent }}>
          tea.rinn7e.com
        </div>
      </div>
      {footNote}
    </div>
  </div>
)

const sublineView = (text: string) => (
  <div style={{ display: 'flex', fontSize: 30, color: color.inkMuted }}>
    {text}
  </div>
)

// The card of the page of an entry. `logoSrc`, `emblemSrc` and `starSrc`
// are data URLs the build reads.
export const shareCardOf = ({
  framework,
  logoSrc,
  emblemSrc,
  starSrc,
}: {
  framework: Framework
  logoSrc: O.Option<string>
  emblemSrc: string
  starSrc: string
}) =>
  frameView({
    tile: pipe(
      logoSrc,
      O.fold(
        () => null,
        (src) => <img src={src} width={132} height={132} />,
      ),
    ),
    title: framework.name,
    subline: (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          fontSize: 30,
          color: color.inkMuted,
        }}
      >
        <div style={{ display: 'flex' }}>{languageLineOf(framework)}</div>
        <div
          style={{
            display: 'flex',
            padding: '2px 14px',
            border: `2px solid ${color.line}`,
            borderRadius: 4,
            fontSize: 24,
          }}
        >
          {tierLabel(framework.tier)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              width: 14,
              height: 14,
              borderRadius: 7,
              background: statusColor(framework.status),
            }}
          />
          <div style={{ display: 'flex', fontSize: 26 }}>
            {statusLabel(framework.status)}
          </div>
        </div>
      </div>
    ),
    strip: chipsView(
      concepts.map((concept: Concept) =>
        chipView(
          conceptLabel(concept),
          shownGradeOf(concept, framework.rubric[concept]),
        ),
      ),
    ),
    lead: framework.summary,
    leadLines: 2,
    footNote:
      framework.stars !== undefined ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 30,
            fontWeight: 500,
            color: color.starInk,
          }}
        >
          <img src={starSrc} width={32} height={32} />
          {`${starCountOf(framework.stars)} stars`}
        </div>
      ) : null,
    emblemSrc,
  })

// What the card of a page that is not an entry shows under its title: a
// row of language logos, or a row of chips
export type PageStrip =
  | { _tag: 'Logos'; logos: ShareLogo[] }
  | { _tag: 'Chips'; chips: { label: string; grade: ShownGrade }[] }

export type PageCard = {
  page: SitePage
  title: string
  subline: string
  lead: string
  strip: PageStrip
  footNote: string
}

// The grades the rubric gives, as its page names them
const legendGrades: ShownGrade[] = [
  'native',
  'managed',
  'equivalent',
  'missing',
]

// As many language logos as a row holds
const STRIP_LOGOS = 12

const topLanguageLogosOf = (entries: Framework[]): ShareLogo[] =>
  pipe(
    languageCountsOf(entries),
    A.filterMap(({ language }) => languageShareLogoOf(language)),
    A.takeLeft(STRIP_LOGOS),
  )

const languageCountOf = (entries: Framework[]): number =>
  new Set(entries.flatMap(languagesOf)).size

export const pageCardOf =
  (entries: Entries) =>
  (page: SitePage): PageCard => {
    const { title, lead } = pageHeadingOf(page)
    switch (page) {
      case 'catalog':
        return {
          page,
          title: 'TEA Ecosystem',
          subline: title,
          lead,
          strip: { _tag: 'Logos', logos: topLanguageLogosOf(entries.catalog) },
          footNote: `${entries.catalog.length} entries in ${languageCountOf(entries.catalog)} languages`,
        }
      case 'adjacent':
        return {
          page,
          title,
          subline: 'Close to TEA, but missing a hard requirement',
          lead,
          strip: {
            _tag: 'Logos',
            logos: topLanguageLogosOf(entries.adjacent),
          },
          footNote: `${entries.adjacent.length} libraries in ${languageCountOf(entries.adjacent)} languages`,
        }
      case 'rubric':
        return {
          page,
          title,
          subline: 'Four grades and three tiers, graded against Elm',
          lead,
          strip: {
            _tag: 'Chips',
            chips: legendGrades.map((grade) => ({
              label: gradeLabel(grade),
              grade,
            })),
          },
          footNote: '',
        }
      case 'about':
        return {
          page,
          title,
          subline: 'Every TEA in one place, graded against Elm',
          lead,
          strip: {
            _tag: 'Chips',
            chips: concepts
              .filter((concept) => concept !== 'ports')
              .map((concept) => ({
                label: conceptLabel(concept),
                grade: 'native',
              })),
          },
          footNote: `${entries.catalog.length} entries, ${entries.adjacent.length} TEA-adjacent`,
        }
      case 'build':
        return {
          page,
          title,
          subline: 'A runtime in eight steps',
          lead,
          strip: {
            _tag: 'Logos',
            logos: pipe(
              ['Swift', 'TypeScript', 'Kotlin'],
              A.filterMap(languageShareLogoOf),
            ),
          },
          footNote: 'In Swift, TypeScript and Kotlin',
        }
      case 'privacy':
        return {
          page,
          title,
          subline: 'No cookies, no accounts, no trackers',
          lead,
          strip: { _tag: 'Logos', logos: [] },
          footNote: '',
        }
    }
  }

// The card of a page that is not an entry: the emblem in the tile.
// `logoSrcs` are the data URLs of the logos of its strip, in order.
export const pageCardViewOf = ({
  card,
  logoSrcs,
  emblemSrc,
}: {
  card: PageCard
  logoSrcs: string[]
  emblemSrc: string
}) =>
  frameView({
    tile: <img src={emblemSrc} width={132} height={132} />,
    title: card.title,
    subline: sublineView(card.subline),
    strip:
      card.strip._tag === 'Chips' ? (
        chipsView(
          card.strip.chips.map((chip) => chipView(chip.label, chip.grade)),
        )
      ) : (
        <div style={{ display: 'flex', gap: 12 }}>
          {logoSrcs.map((src) => (
            <div
              key={src}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 64,
                height: 64,
                // The border and the padding inside the 64 px, as in the
                // frame
                boxSizing: 'border-box',
                border: `2px solid ${color.line}`,
                borderRadius: 6,
                padding: 9,
              }}
            >
              <img src={src} width={42} height={42} />
            </div>
          ))}
        </div>
      ),
    lead: card.lead,
    leadLines: 3,
    footNote: (
      <div style={{ display: 'flex', fontSize: 26, color: color.inkMuted }}>
        {card.footNote}
      </div>
    ),
    emblemSrc,
  })
