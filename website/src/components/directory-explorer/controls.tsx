'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DirectorySelectContext } from '@/contexts/DirectorySelectContext'
import { cn } from '@/lib/utils'

const CENTER_MODAL_STYLE = {
  '--tw-enter-translate-x': '0px',
  '--tw-enter-translate-y': '0px',
  '--tw-exit-translate-x': '0px',
  '--tw-exit-translate-y': '0px',
} as React.CSSProperties

export const PanelHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="border-b border-gray-200 pb-1.5 text-sm font-normal tracking-wide text-gray-600 uppercase">
    {children}
  </h3>
)

interface ScopeButtonProps {
  label: string
  detail: string
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
        ? 'border-un-blue bg-un-blue/5'
        : 'border-gray-200 bg-white hover:border-un-blue'
    )}
  >
    <span
      className={cn(
        'text-sm font-semibold',
        props.selected ? 'text-un-blue' : 'text-gray-900'
      )}
    >
      {props.label}
    </span>
    <span className="line-clamp-2 text-xs leading-snug text-gray-500">
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

/** Renders a centered, scrollable directory dialog. */
export const DirectoryDialog = (props: DirectoryDialogProps) => (
  <Dialog open={props.open} onOpenChange={(next) => !next && props.onClose()}>
    <DialogContent
      style={CENTER_MODAL_STYLE}
      className={cn(
        'flex max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-3 overflow-hidden p-4',
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
