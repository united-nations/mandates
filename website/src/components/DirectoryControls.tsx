'use client'

import { Chip } from '@/components/ui/chip'
import { TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { MousePointerClick } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Chrome shared by the directory sections (entities, organs): the view toggle
 * above the list and the hover tooltip that every selectable node uses. Kept in
 * one place so the two directories stay visually identical — they are read as
 * one pattern on the page.
 */

/**
 * The view-mode switch above a directory list.
 *
 * A segmented control, deliberately not a chip: it used to be a rounded-full
 * pill with an un-blue "on" fill, which is character for character the
 * treatment an *active filter pill* carries in the list directly beneath it —
 * so "I am looking at the compact view" and "I am filtering by UNEP" said the
 * same thing in the same shape. It now borrows the mode switch above the
 * mandate table (MandateExplorerClient), which is the other control in the app
 * that chooses a view rather than a value: a recessed grey track, and the
 * selected segment raised out of it in white.
 */
export function DirectoryToggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  /** Names the group for screen readers ("Entity view"). */
  label: string
  value: T
  options: readonly { value: T; label: string; icon: LucideIcon }[]
  onChange: (value: T) => void
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex shrink-0 items-center rounded-md bg-gray-100 p-0.5 whitespace-nowrap"
    >
      {options.map((option) => {
        const Icon = option.icon
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={cn(
              'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-all',
              selected
                ? 'bg-background text-gray-900 shadow'
                : 'text-gray-500 hover:text-gray-900'
            )}
          >
            <Icon aria-hidden className="h-3.5 w-3.5" />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Tooltip body for a selectable directory node: the full name, a legend for the
 * bare numbers on the card/pill, an optional set of sub-level pills (an entity's
 * subprogrammes), and the click hint.
 *
 * `meta` exists because the cards show one or two unlabelled numbers ("OHCHR
 * 433 4"); spelling them out here is the only place there is room for the
 * words.
 *
 * The pills are filters in their own right. Radix keeps the content hoverable,
 * so the pointer can travel from the trigger into the tooltip and click one.
 */
export function ClickTooltip({
  name,
  meta,
  pills,
  onPillSelect,
  activePill,
}: {
  name?: string | null
  meta?: string
  pills?: { label: string; value: string }[]
  onPillSelect?: (value: string) => void
  activePill?: string
}) {
  const hasPills = pills !== undefined && pills.length > 0
  return (
    <TooltipContent side="top" className={hasPills ? 'max-w-sm' : 'max-w-xs'}>
      {name && <div className="font-medium">{name}</div>}
      {meta && <div className="mt-0.5 text-xs text-gray-500">{meta}</div>}
      {hasPills && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {pills.map((pill) => (
            <Chip
              key={pill.value}
              kind="budget"
              density="dense"
              tone={activePill === pill.value ? 'selected' : 'neutral'}
              href={`/secretariat?subprogramme=${encodeURIComponent(pill.value)}`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onPillSelect?.(pill.value)
              }}
            >
              {pill.label}
            </Chip>
          ))}
        </div>
      )}
      <div className="mt-1 flex items-center gap-1 text-un-blue">
        <MousePointerClick className="h-3.5 w-3.5" />
        Click to show mandates
      </div>
    </TooltipContent>
  )
}
