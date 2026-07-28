'use client'

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

export function DirectoryToggle({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-un-blue text-white hover:bg-un-blue/90'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
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
            <a
              key={pill.value}
              href={`/secretariat?subprogramme=${encodeURIComponent(pill.value)}`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onPillSelect?.(pill.value)
              }}
              className={cn(
                'rounded-full px-2 py-0.5 text-xs transition-colors',
                activePill === pill.value
                  ? 'bg-un-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-un-blue hover:text-white'
              )}
            >
              {pill.label}
            </a>
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
