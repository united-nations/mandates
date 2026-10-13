'use client'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * A small control that reveals a short panel of read-only context: the `?`
 * beside a detail-page heading, the `i` beside a directory listing, the marker
 * on a card whose label does not quite describe it.
 *
 * Ruled behaviour, the same on every instance: opens on hover, click, or
 * keyboard focus; closes on pointer leave, outside click, or Escape with focus
 * returning to the button. All three closes matter — pointer leave does not
 * exist on touch, so a panel built to close only that way traps a touch reader,
 * and a panel that opens only on hover is unreachable there in the first place.
 *
 * The primitive is a Radix Popover styled to read as a tooltip, not a Radix
 * Tooltip. Verified against the installed @radix-ui/react-tooltip source: its
 * trigger ignores touch pointers entirely (`onPointerMove` returns on
 * `pointerType === 'touch'`), its `onClick` *closes*, and `onFocus` is
 * suppressed during pointer interaction — so a tap can never open it and a
 * click actively dismisses it, failing two of the ruled opens. Popover's trigger
 * click toggles, which is what makes the panel reachable on touch; hover and
 * focus opens are added by hand below.
 *
 * `aria-expanded` and `aria-controls` are not set here: Radix's trigger already
 * writes both, plus `aria-haspopup="dialog"`, and a hand-written copy would be a
 * second source of truth for the same state.
 *
 * Callers supply the glyph and the geometry; the state machine is shared so the
 * several places that need this behaviour cannot drift into three subtly
 * different answers to the same touch and keyboard questions.
 */

/* A short open delay filters drive-by transits; the close grace lets the pointer
   cross the gap between button and panel without the panel vanishing underneath
   it. */
const HOVER_DELAY_MS = 150
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'

export function DisclosurePopover({
  label,
  side = 'bottom',
  align = 'start',
  sideOffset = 6,
  triggerClassName,
  contentClassName,
  trigger,
  children,
  interactive = false,
}: {
  /** Accessible name for the trigger, and the panel's own label. */
  label: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  triggerClassName?: string
  contentClassName?: string
  /**
   * What the button shows: a glyph alone where the surrounding text already
   * says what the panel is about, or a short label beside one where it does
   * not. Decorative glyphs take `aria-hidden` — the accessible name is `label`.
   */
  trigger: ReactNode
  children: ReactNode
  /** Allow Tab navigation into panel controls; existing context panels stay read-only. */
  interactive?: boolean
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const openTimerRef = useRef<number | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  // A click fires focus before it fires click; without this guard the focus
  // handler would open the panel and the click would immediately toggle it
  // shut, making a click on the closed button a net no-op.
  const pointerDownRef = useRef(false)
  // Escape returns focus to the button; that programmatic focus must not
  // re-open the panel it just closed.
  const suppressFocusOpenRef = useRef(false)

  const cancelTimers = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }
  useEffect(() => cancelTimers, [])

  // Hover handling ignores touch pointers throughout: a tap synthesises
  // pointerenter before the click and pointerleave when the finger lifts, so
  // without the guard a tap-opened panel would close itself immediately.
  const hoverOpen = (event: React.PointerEvent) => {
    if (event.pointerType === 'touch') return
    cancelTimers()
    openTimerRef.current = window.setTimeout(() => setOpen(true), HOVER_DELAY_MS)
  }
  const hoverClose = (event: React.PointerEvent) => {
    if (event.pointerType === 'touch') return
    cancelTimers()
    closeTimerRef.current = window.setTimeout(
      () => {
        if (interactive && contentRef.current?.contains(document.activeElement))
          return
        setOpen(false)
      },
      HOVER_DELAY_MS
    )
  }
  const hoverKeepOpen = (event: React.PointerEvent) => {
    if (event.pointerType === 'touch') return
    cancelTimers()
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        cancelTimers()
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label={label}
          className={triggerClassName}
          onPointerEnter={hoverOpen}
          onPointerLeave={hoverClose}
          onPointerDown={() => {
            pointerDownRef.current = true
            document.addEventListener(
              'pointerup',
              () => {
                pointerDownRef.current = false
              },
              { once: true }
            )
          }}
          onFocus={() => {
            if (suppressFocusOpenRef.current) {
              suppressFocusOpenRef.current = false
              return
            }
            if (!pointerDownRef.current) {
              cancelTimers()
              setOpen(true)
            }
          }}
          onKeyDown={(event) => {
            if (!interactive || !open || event.key !== 'Tab' || event.shiftKey)
              return
            const first = contentRef.current?.querySelector<HTMLElement>(FOCUSABLE)
            if (first) {
              event.preventDefault()
              cancelTimers()
              first.focus()
            }
          }}
        >
          {trigger}
        </button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        side={side}
        align={align}
        sideOffset={sideOffset}
        aria-label={label}
        className={cn(
          'w-80 max-w-[calc(100vw-2rem)] rounded-md border-border p-3 text-sm shadow-md',
          contentClassName
        )}
        onPointerEnter={hoverKeepOpen}
        onPointerLeave={hoverClose}
        onFocusCapture={() => {
          if (interactive) cancelTimers()
        }}
        onFocusOutside={(event) => {
          if (interactive && event.target === triggerRef.current)
            event.preventDefault()
        }}
        onKeyDown={(event) => {
          if (!interactive || event.key !== 'Tab') return
          const controls = Array.from(
            contentRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []
          )
          if (event.shiftKey && document.activeElement === controls[0]) {
            event.preventDefault()
            triggerRef.current?.focus()
          } else if (
            !event.shiftKey &&
            document.activeElement === controls[controls.length - 1]
          ) {
            // Radix loops Tab within content, even for non-modal popovers.
            // Resume the surrounding page's tab order after this trigger.
            const pageControls = Array.from(
              document.querySelectorAll<HTMLElement>(FOCUSABLE)
            ).filter(
              (control) =>
                !contentRef.current?.contains(control) &&
                control.tabIndex >= 0 &&
                !control.closest('[inert]') &&
                control.getClientRects().length > 0
            )
            const trigger = triggerRef.current
            const next = trigger
              ? pageControls[pageControls.indexOf(trigger) + 1]
              : undefined
            event.preventDefault()
            cancelTimers()
            setOpen(false)
            if (!next) suppressFocusOpenRef.current = true
            ;(next ?? trigger)?.focus()
          }
        }}
        // Hover never moves focus; interactive panels accept Tab explicitly
        // from the trigger so their links join the surrounding page's order.
        onOpenAutoFocus={(event) => event.preventDefault()}
        // Radix would return focus to the trigger on *every* close; the ruled
        // behaviour ties focus return to Escape alone — an outside click puts
        // focus where the user clicked, which is what they asked for.
        onCloseAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={() => {
          const trigger = triggerRef.current
          if (trigger && document.activeElement !== trigger) {
            suppressFocusOpenRef.current = true
            trigger.focus()
          }
        }}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
