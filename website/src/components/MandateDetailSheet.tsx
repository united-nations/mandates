'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Maximize2 } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import type { ReactNode } from 'react'

interface MandateDetailSheetProps {
  title: string
  children: ReactNode
}

/**
 * Modal shell for the intercepting route @modal/(.)mandate/...
 *
 * The modal can only be reached by an in-app soft navigation from the list,
 * so the one correct way to dismiss it is router.back() — popping the history
 * entry that created the interception. (router.push does NOT tear down a
 * parallel-route slot, which is why anything other than back() left the modal
 * stuck open.) The standalone /mandate page has its own back affordance.
 */
export function MandateDetailSheet({
  title,
  children,
}: MandateDetailSheetProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const qs = searchParams.toString()
  const fullPageHref = qs ? `${pathname}?${qs}` : pathname

  return (
    <Sheet open onOpenChange={(open) => !open && router.back()}>
      {/* The page reserves a permanent scrollbar gutter
          (html { scrollbar-gutter: stable }), so a fixed right:0 element is
          laid out inside that gutter and sits ~15px from the physical window
          edge. Radix's scroll-lock (react-remove-scroll) publishes the exact
          width as the inherited CSS var --removed-body-scroll-bar-size on the
          locked body; offset the sheet right by that. Falls back to 0px when
          unset (overlay scrollbars / not locked) so it never over-corrects. */}
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 mr-[calc(var(--removed-body-scroll-bar-size,0px)*-1)] sm:max-w-2xl lg:max-w-3xl"
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>

        {/* Plain anchor = real hard navigation to the standalone page (which
            keeps the same ?ppb_version scoping). Simpler and more reliable
            than window.location in a click handler. */}
        <a
          href={fullPageHref}
          aria-label="Open full page"
          title="Open full page"
          className="absolute right-11 top-3 z-50 rounded-sm p-1 opacity-70 ring-offset-background transition-opacity hover:bg-secondary hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
        >
          <Maximize2 className="h-4 w-4" />
        </a>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
