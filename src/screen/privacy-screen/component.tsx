import { IconExternalLink } from '@tabler/icons-react'
import { type ReactNode, memo } from 'react'

import { pageHeadingOf } from '@/common/data/page-heading'
import { sectionBoxClass, sectionTitleView } from '@/component/section-title'

import { type Props, PropsEq } from './type'

const rowClass =
  'border-line flex flex-col items-start gap-[6px] border-b px-[18px] py-[14px] last:border-b-0 lg:grid lg:grid-cols-[160px_1fr] lg:items-baseline lg:gap-[16px]'

const rowView = ({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) => (
  <div className={rowClass}>
    <span className='text-ink text-sm font-normal'>{label}</span>
    <span className='text-ink-muted text-sm'>{children}</span>
  </div>
)

const externalLinkView = ({ href, label }: { href: string; label: string }) => (
  <a
    href={href}
    target='_blank'
    rel='noreferrer'
    className='text-accent inline-flex items-center gap-[2px] hover:underline'
  >
    {label}
    <IconExternalLink size={12} stroke={1.75} aria-hidden />
  </a>
)

// Every party that sees a visit and everything the site keeps in the
// browser. It changes in the same commit as the code or the hosting:
// see "The privacy page" in `doc/code-convention.md`.
const PrivacyComponent = (_props: Props) => (
  <div className='flex flex-col gap-[32px]'>
    <section className='flex flex-col items-center gap-[12px] text-center'>
      <h1 className='text-ink text-[2rem] leading-tight font-normal text-balance lg:text-[2.625rem]'>
        {pageHeadingOf('privacy').title}
      </h1>
      <p className='text-ink-muted max-w-[640px] text-base text-balance'>
        {pageHeadingOf('privacy').lead}
      </p>
    </section>

    <section className='flex flex-col gap-[14px]'>
      {sectionTitleView({ title: 'What the site uses' })}
      <div className={`${sectionBoxClass} bg-panel`}>
        {rowView({
          label: 'Hosting',
          children: (
            <>
              The site is served by Cloudflare, which handles each request (and
              so sees your IP address) to deliver the page, under the{' '}
              {externalLinkView({
                href: 'https://www.cloudflare.com/privacypolicy/',
                label: 'Cloudflare privacy policy',
              })}
              .
            </>
          ),
        })}
        {rowView({
          label: 'Analytics',
          children:
            'Cloudflare Web Analytics counts visits: the page, the referring site, the country, the browser and the kind of device. It sets no cookie, does not fingerprint you and does not follow you across sites. The counts are only ever seen in total.',
        })}
        {rowView({
          label: 'GitHub',
          children: (
            <>
              Your browser asks the GitHub API for the star count of the
              repository, at most once an hour, so GitHub sees that request
              under the{' '}
              {externalLinkView({
                href: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
                label: 'GitHub privacy statement',
              })}
              .
            </>
          ),
        })}
        {rowView({
          label: 'Your browser',
          children:
            'The site keeps one value in local storage: that star count and when it was read, so it does not ask GitHub on every page. It holds nothing about you, and clearing the data of the site removes it.',
        })}
      </div>
    </section>

    <section className='flex flex-col gap-[14px]'>
      {sectionTitleView({ title: 'What it does not do' })}
      <p className='text-ink-muted text-center text-sm text-balance'>
        No cookies, no accounts, no forms, no ads and no third-party trackers.
        The fonts, the logos and the icons are served from the site itself.
        Nothing is sold or shared.
      </p>
    </section>

    <section className='flex flex-col gap-[14px]'>
      {sectionTitleView({ title: 'Questions' })}
      <p className='text-ink-muted text-center text-sm text-balance'>
        Open an issue on{' '}
        {externalLinkView({
          href: 'https://github.com/rinn7e/tea-ecosystem/issues',
          label: 'GitHub',
        })}
        . This page changes with the site, and its history is in the repository.
      </p>
    </section>
  </div>
)

export const PrivacyMemo = memo(PrivacyComponent, PropsEq.equals)
