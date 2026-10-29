'use client'

import { sidebarHref } from '@/lib/sidebar-link'
import { toast } from 'sonner'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ExternalLink as ExternalLinkIcon,
  FileText,
  Maximize2,
  Share2,
  Check,
  X,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { DocumentSymbol } from '@/components/DocumentSymbol'
import { DetailPanel } from '@un-eosg/ui/components/detail-panel'
import { DetailPanelControls } from '@un-eosg/ui/components/detail-panel-controls'
import { useEffect, useState, useRef, type ReactNode } from 'react'

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
  const [copied, setCopied] = useState(false)
  const mounted = useRef(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
    }
  }, [])
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Match open/: no reserved page gutter beside the fixed sidebar.
  // Radix handles scroll locking; restore the page gutter when this closes.
  useEffect(() => {
    const rootStyle = document.documentElement.style
    const previousGutter = rootStyle.scrollbarGutter
    rootStyle.scrollbarGutter = 'auto'
    return () => {
      rootStyle.scrollbarGutter = previousGutter
    }
  }, [])

  const qs = searchParams.toString()
  const fullPageHref = qs ? `${pathname}?${qs}` : pathname

  async function copyLink() {
    if (!symbol) return
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${sidebarHref(symbol, qs)}`
      )
      if (!mounted.current) return
      setCopied(true)
      toast.success('Link copied')
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      if (mounted.current)
        toast.error('Could not copy the link. Please try again.')
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && router.back()}>
      <SheetContent
        side="right"
        hideClose
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl lg:max-w-3xl"
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

        <DetailPanel
          title={title}
          eyebrow={eyebrow}
          headerMetadata={
            (symbol || link) && (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {symbol && (
                  <DocumentSymbol className="inline-flex items-baseline">
                    {symbol}
                  </DocumentSymbol>
                )}
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-baseline gap-1.5 text-sm font-medium text-un-blue-text hover:underline"
                  >
                    <FileText aria-hidden className="h-3.5 w-3.5 self-center" />
                    <span>View PDF</span>
                    <ExternalLinkIcon
                      aria-hidden
                      className="h-3 w-3 self-center"
                    />
                  </a>
                )}
              </div>
            )
          }
          controls={
            <DetailPanelControls
              share={
                symbol
                  ? {
                      label: copied
                        ? 'Link copied'
                        : 'Copy link to this sidebar',
                      onClick: copyLink,
                      icon: copied ? (
                        <Check aria-hidden className="size-4" />
                      ) : (
                        <Share2 aria-hidden className="size-4" />
                      ),
                    }
                  : undefined
              }
              // A real anchor leaves the intercepted route and preserves query scope.
              expand={{
                label: 'Open full page',
                href: fullPageHref,
                icon: <Maximize2 aria-hidden className="h-4 w-4" />,
              }}
              close={{
                label: 'Close',
                onClick: () => router.back(),
                icon: <X aria-hidden className="h-4 w-4" />,
              }}
            />
          }
        >
          {children}
        </DetailPanel>
      </SheetContent>
    </Sheet>
  )
}
