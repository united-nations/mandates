'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ExternalLink as ExternalLinkIcon,
  FileText,
  Maximize2,
  X,
} from 'lucide-react'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  sheetControlClass,
} from '@/components/ui/sheet'
import { DocumentSymbol } from '@/components/DocumentSymbol'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface MandateDetailSheetProps {
  /** The record's name. Visible in the header, and it stays there. */
  title: string
  /** What kind of record. Sits above the name and quieter than it. */
  eyebrow?: string
  /** Document symbol — the identifier. */
  symbol?: string
  /** Source PDF, if there is one. */
  link?: string | null
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
 * THE HEADER
 * ----------
 * It used to be a bar holding two buttons and nothing else, while the record's
 * name lived in the scroll area and vanished the moment you scrolled. It now
 * carries the whole identity of the record — kind, name, symbol, source — which
 * removes an entire screen-height block from the body and leaves one fixed
 * place answering "what am I looking at?".
 *
 * The controls stay in NORMAL FLOW beside that, never floated. Floating them
 * was the original bug: each was positioned against a different origin, their
 * 44px hit areas met at the seam, and they hovered over the heading, which had
 * no idea they were there. In flow they cannot overlap anything at any width.
 */
export function MandateDetailSheet({
  title,
  eyebrow,
  symbol,
  link,
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
            DialogContent has no description. Mirrors the visible section
            questions, and has to be re-read whenever one of them changes. */}
        <SheetDescription className="sr-only">
          Details for mandate document {title}: who adopted it, how it has
          changed, who cites it in the budget, what subjects it has and what is
          in it.
        </SheetDescription>

        <header className="flex shrink-0 items-start gap-3 border-b border-border bg-secondary/60 px-5 py-3">
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                {eyebrow}
              </p>
            )}
            {/* Truncates rather than wraps: a fixed anchor must not change
                height as the body scrolls under it. */}
            <h2 className="truncate text-lg leading-tight font-semibold text-foreground">
              {title}
            </h2>
            {(symbol || link) && (
              // Identifier and source sit together directly under the name.
              // Proximity groups them as "how to find this document", separate
              // from the name itself.
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                {symbol && <DocumentSymbol>{symbol}</DocumentSymbol>}
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-un-blue hover:underline"
                  >
                    <FileText aria-hidden className="h-3.5 w-3.5" />
                    View PDF
                    <ExternalLinkIcon aria-hidden className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {/* Plain anchor = real hard navigation to the standalone page
                (which keeps the same ?ppb_version scoping). */}
            <a
              href={fullPageHref}
              title="Open full page"
              className={sheetControlClass}
            >
              <Maximize2 aria-hidden className="h-4 w-4" />
              <span className="sr-only">Open full page</span>
            </a>
            {/* me-1 leaves room for the focus ring: flush to the panel edge, a
                2px ring with a 2px offset is clipped. */}
            <SheetClose title="Close" className={cn(sheetControlClass, 'me-1')}>
              <X aria-hidden className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetClose>
          </div>
        </header>

        {/* `.un-scrollbar` lives in globals.css — see the note there for why
            the standard and WebKit mechanisms cannot be stacked. */}
        <div className="un-scrollbar min-h-0 flex-1 overflow-y-auto">
          <div className="px-5 py-6">{children}</div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
