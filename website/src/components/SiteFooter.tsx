import {
  SiteFooter as SharedSiteFooter,
  type FooterLabels,
} from '@un-eosg/ui/components/site-footer'

// Mandates currently has one UI locale; the shared footer accepts all six UN locales.
const labels: FooterLabels = {
  home: 'United Nations',
  donate: 'Donate',
  socialNavigation: 'Social media',
  linksNavigation: 'United Nations links',
  newTab: 'opens in new tab',
  links: {
    siteIndex: 'A-Z Site Index',
    contact: 'Contact',
    copyright: 'Copyright',
    faq: 'FAQ',
    fraudAlert: 'Fraud Alert',
    privacyNotice: 'Privacy Notice',
    termsOfUse: 'Terms of Use',
  },
}

export function SiteFooter() {
  return (
    <SharedSiteFooter
      locale="en"
      labels={labels}
      donateHref="https://www.un.org/en/about-us/how-to-donate-to-the-un-system"
      containerClassName="max-w-4xl px-8 sm:px-12 lg:max-w-6xl lg:px-16"
    />
  )
}
