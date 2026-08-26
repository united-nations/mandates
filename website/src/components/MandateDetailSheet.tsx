'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Maximize2, X } from 'lucide-react'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  sheetControlClass,
} from '@/components/ui/sheet'
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
 *
 * THE CORNER CONTROLS
 * -------------------
 * "Open full page" and "Close" are one cluster in NORMAL FLOW, in a bar above
 * the scroll area — not two independently positioned floating buttons.
 *
 * Floating them was the bug: each was absolutely positioned against a different
 * origin (the sheet's own `right-2` close, and this component's `right-14`
 * link), so their 44px hit areas met at the seam and, more importantly, they
 * hovered over the H1, which starts at the top of the scrolled content and has
 * no idea they are there. A flow bar cannot overlap the heading at any width,
 * and it cannot overlap scrolled content either, because the content scrolls
 * *below* it rather than under it.
 *
 * Both controls share `sheetControlClass`, so they are the same 44px square
 * with the same focus ring; `gap-1` is the only spacing between them.
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
        hideClose
        className="mr-[calc(var(--removed-body-scroll-bar-size,0px)*-1)] flex w-full flex-col gap-0 p-0 sm:max-w-2xl lg:max-w-3xl"
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        {/* Radix warns (and screen readers lose the announcement) when a
            DialogContent has no description. */}
        {/* Mirrors the visible section questions, and has to be re-read
            whenever one of them changes - it drifted once already, still
            saying "what it is about" after that heading became "What
            subjects does this mandate have?". Says "cites it in the budget",
            never "implements": the data records budget citations, and the
            sr-only layer must not assert more than the headings do. */}
        <SheetDescription className="sr-only">
          Details for mandate document {title}: who adopted it, how it has
          changed, who cites it in the budget, what subjects it has and what is
          in it.
        </SheetDescription>

        <div className="flex shrink-0 items-center justify-end gap-1 border-b border-gray-200 px-2 py-1">
          {/* Plain anchor = real hard navigation to the standalone page (which
              keeps the same ?ppb_version scoping). Simpler and more reliable
              than window.location in a click handler. */}
          <a
            href={fullPageHref}
            title="Open full page"
            className={sheetControlClass}
          >
            <Maximize2 aria-hidden className="h-4 w-4" />
            <span className="sr-only">Open full page</span>
          </a>
          <SheetClose title="Close" className={sheetControlClass}>
            <X aria-hidden className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
