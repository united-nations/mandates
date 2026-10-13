'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { DirectorySelectContext } from '@/contexts/DirectorySelectContext'
import { cn } from '@/lib/utils'

// Zeroes the Radix enter/exit slide on both axes, so the dialog appears where
// it will sit rather than travelling to it.
const NO_SLIDE_STYLE = {
  '--tw-enter-translate-x': '0px',
  '--tw-enter-translate-y': '0px',
  '--tw-exit-translate-x': '0px',
  '--tw-exit-translate-y': '0px',
} as React.CSSProperties

export const PanelHeading = ({
  aside,
  children,
}: {
  /** Status for this block. Beside the heading, so it costs no height. */
  aside?: React.ReactNode
  children: React.ReactNode
}) => (
  <div className="flex items-center justify-between gap-3 border-b border-border pb-1.5">
    <h3 className="min-w-0 truncate text-sm font-normal tracking-wide text-muted-foreground uppercase">
      {children}
    </h3>
    {aside}
  </div>
)

/**
 * Says which budget is being read while the switch to it is in flight. A
 * status region rather than part of the heading, so the heading keeps its
 * name; the spinner itself is decoration and the label carries the meaning.
 */
export const HeadingProgress = ({ label }: { label: string }) => (
  <span
    role="status"
    className="flex shrink-0 items-center gap-2 text-sm text-un-blue-text"
  >
    <Spinner />
    {label}
  </span>
)

interface ScopeButtonProps {
  label: string
  detail: string
  /** The detail is a figure that does not yet match the selection. */
  detailPending?: boolean
  selected: boolean
  onClick: () => void
}

export const ScopeButton = (props: ScopeButtonProps) => (
  <button
    type="button"
    onClick={props.onClick}
    aria-pressed={props.selected}
    className={cn(
      'flex max-w-sm min-w-0 flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-all focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-1 focus-visible:outline-none',
      props.selected
        ? 'border-un-blue bg-accent'
        : 'border-border bg-white hover:border-un-blue'
    )}
  >
    <span
      className={cn(
        'text-sm font-semibold',
        props.selected ? 'text-un-blue-text' : 'text-foreground'
      )}
    >
      {props.label}
    </span>
    <span
      className={cn(
        'line-clamp-2 text-sm leading-snug text-muted-foreground transition-opacity duration-150',
        props.detailPending ? 'opacity-40' : 'opacity-100'
      )}
    >
      {props.detail}
    </span>
  </button>
)

interface DirectoryDialogProps {
  open: boolean
  onClose: () => void
  title: string
  hint: string
  children: React.ReactNode
}

/**
 * Renders a scrollable directory dialog, held near the top of the viewport.
 *
 * Centring it made every height change move both edges, so expanding a branch
 * of the budget tree slid the rows the reader was reading out from under the
 * pointer - visible in any window tall enough that the dialog is shorter than
 * the 88vh cap, and the collapsed-by-default tree means most windows now are.
 * Anchored, the top edge and everything measured from it stay put and only the
 * bottom edge moves. DialogContent has no other caller, so this is the four
 * directory dialogs and nothing else.
 */
export const DirectoryDialog = (props: DirectoryDialogProps) => (
  <Dialog open={props.open} onOpenChange={(next) => !next && props.onClose()}>
    <DialogContent
      style={NO_SLIDE_STYLE}
      className={cn(
        'top-[6vh] flex max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-4xl translate-y-0 flex-col gap-3 overflow-hidden p-4',
        'sm:w-[calc(100vw-4rem)] sm:p-6'
      )}
    >
      <DialogHeader className="text-left">
        <DialogTitle>{props.title}</DialogTitle>
        <DialogDescription>{props.hint}</DialogDescription>
      </DialogHeader>
      <DirectorySelectContext.Provider value={{ onSelect: props.onClose }}>
        <div className="-mr-1 min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
          {props.children}
        </div>
      </DirectorySelectContext.Provider>
    </DialogContent>
  </Dialog>
)
