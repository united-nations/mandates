'use client'

import { ExternalLink } from '@/components/external-link'
import {
  SOCIAL_LABELS,
  SocialIcon,
  type SocialNetwork,
} from '@/components/social-icons'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const pageWidth = 'max-w-4xl lg:max-w-6xl xl:max-w-7xl'
const pagePadding = 'px-8 sm:px-12 lg:px-16'

// ---------------------------------------------------------------------------
// Replica of the www.un.org footer. Markup was scraped from un.org/en/ and
// the exact dimensions/colors below were read with Playwright from the live
// site's computed styles. English-only here (mandates is single-locale).
// ---------------------------------------------------------------------------

type LinkKey =
  | 'siteIndex'
  | 'contact'
  | 'copyright'
  | 'faq'
  | 'fraudAlert'
  | 'privacyNotice'
  | 'termsOfUse'

const LINKS: Record<LinkKey, { label: string; path: string }> = {
  siteIndex: { label: 'A-Z Site Index', path: 'site-index' },
  contact: { label: 'Contact', path: 'contact-us-0' },
  copyright: { label: 'Copyright', path: 'about-us/copyright' },
  faq: { label: 'FAQ', path: 'about-us/frequently-asked-questions' },
  fraudAlert: { label: 'Fraud Alert', path: 'about-us/fraud-alert' },
  privacyNotice: { label: 'Privacy Notice', path: 'about-us/privacy-notice' },
  termsOfUse: { label: 'Terms of Use', path: 'about-us/terms-of-use' },
}

const LINK_ORDER: LinkKey[] = [
  'siteIndex',
  'contact',
  'copyright',
  'faq',
  'fraudAlert',
  'privacyNotice',
  'termsOfUse',
]

const SOCIAL: [SocialNetwork, string][] = [
  ['facebook', 'https://www.facebook.com/unitednations'],
  ['x', 'https://twitter.com/un'],
  ['youtube', 'https://www.youtube.com/unitednations'],
  ['flickr', 'https://www.flickr.com/photos/un_photo/'],
  ['instagram', 'https://www.instagram.com/unitednations'],
]

function unUrl(path: string = ''): string {
  const tail = path.replace(/^\/+/, '')
  return tail ? `https://www.un.org/en/${tail}` : 'https://www.un.org/en/'
}

// Bottom-of-page footer mounted in the root layout so every route gets it.
//
// Pixel replica of the www.un.org footer (4px blue border, #333 panel,
// reverse logo, social accounts, Donate, 3px-pipe separated links).
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-4 border-un-blue bg-[#333333] text-white">
      <div
        className={cn(
          'mx-auto pt-8 pb-[33px]',
          pagePadding,
          pageWidth,
        )}
      >
        <div className="flex flex-wrap items-center gap-y-6">
          <ExternalLink
            href={unUrl()}
            className="shrink-0 transition-opacity hover:opacity-80"
          >
            <Image
              src="/images/un-logo-en-reverse.svg"
              alt="United Nations"
              width={170}
              height={52}
              className="h-[52px] w-auto select-none"
              draggable={false}
            />
          </ExternalLink>
          <div className="ms-auto flex items-center ps-4">
            <nav aria-label="Social media" className="flex items-center gap-7">
              {SOCIAL.map(([network, href]) => (
                <ExternalLink
                  key={network}
                  href={href}
                  aria-label={SOCIAL_LABELS[network]}
                  className="text-[#c4c4c4] transition-colors hover:text-white"
                >
                  <SocialIcon network={network} className="h-6 w-6" />
                </ExternalLink>
              ))}
            </nav>
            {/* On un.org the icon/button divider is a border on the donate
                wrapper: 28px after the icons, 1px #808080 line, 21px before
                the button — exactly as tall as the button. */}
            <div className="ms-7 border-s border-[#808080] ps-[21px]">
              <ExternalLink
                href={unUrl('about-us/how-to-donate-to-the-un-system')}
                className="inline-block rounded border border-un-blue bg-white px-5 pt-[9px] pb-[10px] text-xs leading-3 font-bold tracking-[1.27px] whitespace-nowrap text-[#454545] uppercase transition-colors hover:bg-[#e6e6e6]"
              >
                Donate
              </ExternalLink>
            </div>
          </div>
        </div>
        <div aria-hidden className="mt-4 mb-[19px] border-t border-[#5b5b5b]" />
        <nav aria-label="United Nations links">
          <ul className="flex flex-wrap justify-end gap-y-2 text-xs leading-[14px] font-medium tracking-[0.77px] uppercase">
            {LINK_ORDER.map((key) => (
              <li
                key={key}
                className="border-e-[3px] border-[#808080] ps-2.5 pe-[13px] last:border-e-0 last:pe-0"
              >
                <ExternalLink
                  href={unUrl(LINKS[key].path)}
                  className="hover:underline"
                >
                  {LINKS[key].label}
                </ExternalLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
