'use client'
// Separate client boundary so RootLayout stays a Server Component while usePathname and context providers work here.

import { BackButton } from '@/components/BackButton'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { FilterProvider } from '@/contexts/FilterContext'
import dynamic from 'next/dynamic'
import { usePathname, useSelectedLayoutSegment } from 'next/navigation'

// Dynamic import to prevent SSR and eliminate hydration errors
const AnimatedLogo = dynamic(
  () => import('@/components/AnimatedLogo').then((mod) => mod.AnimatedLogo),
  {
    ssr: false,
  }
)

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // A mandate opened from the list renders as an intercepting modal (the
  // @modal parallel slot) *over* the underlying full-bleed page. During that
  // interception usePathname() reports the modal's /mandate/... URL even though
  // the page behind it is still /secretariat. Keying the layout off pathname
  // alone would therefore swap the underlying <main> to the centred column and
  // insert the back-button bar the moment the sheet opens — shifting and
  // narrowing the list behind it. Detect the active modal slot and treat the
  // interception as if we were still on the underlying (full-bleed) list.
  const isModalOpen = useSelectedLayoutSegment('modal') !== null
  // Top-level nav destinations don't get a back button — it's reserved for
  // detail pages reached from within the app.
  const isMainPage =
    isModalOpen || ['/secretariat', '/system'].includes(pathname)
  const isDiffPage = pathname === '/diff'
  // The redesigned /secretariat and /system pages are full-bleed (hero
  // banners, colour bands) and manage their own per-section widths, so they
  // opt out of the shared centred/padded main column.
  const isFullBleed =
    isModalOpen || ['/secretariat', '/system'].includes(pathname)
  // One route takes a wider centred column: the focal point directory, whose
  // table carries eight columns whose measured floors sum to 1150 and does not
  // fit the 1024 that max-w-6xl leaves. The alternative was a public table
  // scrolling sideways on arrival. See DirectorySummaryColumns for the
  // arithmetic and for what the change costs at viewports between 1152 and
  // 1280.
  //
  // Applied to the back-button bar as well as to main, because the two are one
  // column as far as a reader is concerned and a back button indented 64px
  // further than the heading below it reads as a mistake. Nothing else on the
  // site moves: every other route still resolves to max-w-6xl here, and the
  // header and footer keep their own containers, which are unchanged and
  // deliberately so - the shell is the site's and not this page's.
  const isWideColumn = !isFullBleed && pathname === '/focal-points/directory'
  // The wide variant raises the cap AND keeps the narrower sm padding at lg
  // instead of stepping up to px-16. Both are needed and the second is the one
  // that is easy to miss: what the table gets is the cap MINUS the padding,
  // and at a 1280 viewport the cap is not even reached, because the vertical
  // scrollbar takes 15px first. With px-16 the content box there is 1137 and
  // the table's 1150 of floors scrolls by 13px at the single most common
  // desktop width. Keeping px-12 gives 1169 and it fits. Measured, not
  // reasoned: see the figures in DirectorySummaryColumns.
  const columnClass = isWideColumn
    ? 'max-w-4xl px-8 sm:px-12 lg:max-w-7xl'
    : 'max-w-4xl px-8 sm:px-12 lg:max-w-6xl lg:px-16'

  return (
    <TooltipProvider>
      <FilterProvider>
        <SiteHeader />

        {/* Back Button - shown on all pages except main page and diff page */}
        {!isMainPage && !isDiffPage && (
          <div className={`mx-auto mb-2 w-full pt-6 ${columnClass}`}>
            <BackButton />
          </div>
        )}

        <main
          className={
            isFullBleed ? 'w-full' : `mx-auto w-full py-6 ${columnClass}`
          }
        >
          {children}
        </main>

        {/* Feedback button is the Sentry user-feedback widget, mounted
            globally in src/instrumentation-client.ts (fixed bottom-right).
            It replaced the old Airtable "Give Feedback" link. */}

        {/* UN80 Logo with UN20 Animation - fixed at bottom */}
        <AnimatedLogo />

        <SiteFooter />

        <Toaster />
      </FilterProvider>
    </TooltipProvider>
  )
}
