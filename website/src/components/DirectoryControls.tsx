'use client'

import { TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { MousePointerClick } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Chrome shared by the directory sections (entities, organs): the view toggles
 * above the list, the box that bounds one compact group, and the hover tooltip
 * that every selectable node uses. Kept in one place so the two directories stay
 * visually identical — they are read as one pattern on the page.
 */

/**
 * Container for a compact grouping (a Programme Budget part, a Peacekeeping
 * group, an organ category): a faint UN-blue wash with a left accent border, so
 * each group reads as one bounded unit.
 */
export const DIRECTORY_GROUP_BOX =
  'border-l-4 border-un-blue bg-un-blue/10 px-4 py-3'

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
 * Tooltip body for a selectable directory node: the full name, an optional set
 * of sub-level pills (an entity's subprogrammes), and the click hint.
 */
export function ClickTooltip({
  name,
  pills,
}: {
  name?: string | null
  pills?: string[]
}) {
  const hasPills = pills !== undefined && pills.length > 0
  return (
    <TooltipContent side="top" className={hasPills ? 'max-w-sm' : 'max-w-xs'}>
      {name && <div className="font-medium">{name}</div>}
      {hasPills && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {pills.map((pill) => (
            <span
              key={pill}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700"
            >
              {pill}
            </span>
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
