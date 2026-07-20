'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type {
  UnSystemPointValue,
  UnSystemRegistry,
  UnSystemRegistryPoint,
} from '@/types'
import { ExternalLink, Info } from 'lucide-react'
import Link from 'next/link'

const POINT_ORDER: UnSystemRegistryPoint[] = [
  'documents',
  'mandates',
  'budget',
  'implementation',
  'results',
]

const POINT_LABELS: Record<UnSystemRegistryPoint, string> = {
  documents: 'Documents',
  mandates: 'Active mandates',
  budget: 'Budget-linked',
  implementation: 'Implementation-linked',
  results: 'Results-linked',
}

/** Generic point definitions, shown when no org-specific evidence note exists. */
const POINT_DEFINITIONS: Record<UnSystemRegistryPoint, string> = {
  documents: 'decision texts are compiled and publicly findable',
  mandates: 'the system knows which decisions are active vs superseded',
  budget: 'specific mandates are linked to budget or financial information',
  implementation: 'implementation status is reported per decision',
  results: 'results are reported against specific decisions',
}

// Traffic-light ramp by total score; CVD-validated as a set in globals.css.
const FILLED: Record<number, string> = {
  1: 'bg-tier-1',
  2: 'bg-tier-2',
  3: 'bg-tier-3',
  4: 'bg-tier-4',
}
const RING: Record<number, string> = {
  1: 'border-tier-1',
  2: 'border-tier-2',
  3: 'border-tier-3',
  4: 'border-tier-4',
}

function score(registry: UnSystemRegistry): number {
  return POINT_ORDER.reduce((sum, key) => {
    const value = registry.points[key].value
    return sum + (value === true ? 1 : value === 'partial' ? 0.5 : 0)
  }, 0)
}

function colorStep(total: number): number {
  if (total >= 3.5) return 4
  if (total >= 2.5) return 3
  if (total >= 1.5) return 2
  return 1
}

function Dot({ value, step }: { value: UnSystemPointValue; step: number }) {
  return (
    <span
      className={cn(
        'h-2 w-2 shrink-0 rounded-full',
        value === true && FILLED[step],
        value === 'partial' && `border-[1.5px] bg-transparent ${RING[step]}`,
        value === false && 'bg-gray-300'
      )}
    />
  )
}

/**
 * Five positional dots, one per point (documents · mandates · budget ·
 * implementation · results): filled = earned, ring = partial, gray = not.
 * Color encodes the total score; the fill pattern, not the color, is the
 * primary signal.
 */
function PointDots({ registry }: { registry: UnSystemRegistry }) {
  const total = score(registry)
  const step = colorStep(total)
  return (
    <span
      className="inline-flex items-center gap-1"
      role="img"
      aria-label={`${total} of 5 points`}
    >
      {POINT_ORDER.map((key) => (
        <Dot key={key} value={registry.points[key].value} step={step} />
      ))}
    </span>
  )
}

/**
 * Tooltip body: each point with its state and the org-specific evidence
 * from the research dossier (falling back to the generic definition).
 */
function PointLegend({ registry }: { registry: UnSystemRegistry }) {
  const step = colorStep(score(registry))
  return (
    <div className="max-w-80">
      <p className="text-sm font-medium">{score(registry)} of 5 points</p>
      <ul className="mt-1.5 space-y-1.5">
        {POINT_ORDER.map((key) => {
          const { value, note } = registry.points[key]
          return (
            <li key={key} className="flex gap-2 text-xs">
              <span className="flex h-4 items-center">
                <Dot value={value} step={step} />
              </span>
              <span className={cn(value === false && 'text-muted-foreground')}>
                <span className="font-medium">
                  {POINT_LABELS[key]}
                  {value === 'partial' && ' (partial)'}
                </span>
                <span className="text-muted-foreground">
                  {' — '}
                  {note ?? POINT_DEFINITIONS[key]}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Page-level legend for the point meter: the five criteria with their
 * generic definitions, rendered once under the /system hero so the dots
 * are explained before the reader meets them in the tables.
 */
export function UnSystemRegistryLegend() {
  return (
    <div className="rounded-r-lg border-l-[3px] border-un-blue bg-un-blue/5 px-5 py-4 text-sm leading-relaxed text-foreground">
      <p className="mb-2">
        The registry score shows how far an organization&apos;s mandates can be
        traced publicly — one point for each of the following (filled dot = met,
        ring = partial, gray = not met):
      </p>
      <ul className="space-y-1.5">
        {POINT_ORDER.map((key) => (
          <li key={key} className="flex items-baseline gap-2">
            <span
              className="h-2 w-2 shrink-0 self-center rounded-full bg-tier-4"
              aria-hidden
            />
            <span>
              <span className="font-medium">{POINT_LABELS[key]}</span>
              {' — '}
              {POINT_DEFINITIONS[key]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Point-meter column cell: the traffic-light dots with an evidence-backed
 * point-breakdown tooltip — or an em dash with an explanatory tooltip when
 * the organization has no registry-like system.
 */
export function UnSystemRegistryDots({
  registry,
  note,
}: {
  registry: UnSystemRegistry | null
  note: string | null
}) {
  if (!registry) {
    if (!note) return null
    return (
      <Tooltip>
        <TooltipTrigger
          aria-label="No mandate registry — details"
          className="inline-flex cursor-help items-center gap-1 text-sm text-gray-500"
        >
          — <Info className="h-3.5 w-3.5" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-72">
          {note}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger className="cursor-help">
        <PointDots registry={registry} />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-none">
        <PointLegend registry={registry} />
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Registry-link column cell: the system's proper name, with the taxonomy
 * category in the tooltip. The external-link icon flows inline after the
 * last word so it never detaches when the name wraps.
 */
export function UnSystemRegistryLink({
  registry,
}: {
  registry: UnSystemRegistry | null
}) {
  if (!registry) return null

  const internal = registry.url.startsWith('/')
  const linkClass = 'text-sm text-un-blue hover:underline'
  // Bind the icon to the last word so it can never wrap onto a line alone.
  const words = registry.name.split(' ')
  const lastWord = words.pop()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {internal ? (
          <Link href={registry.url} className={linkClass}>
            {registry.name}
          </Link>
        ) : (
          <a
            href={registry.url}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {words.length > 0 && `${words.join(' ')} `}
            <span className="whitespace-nowrap">
              {lastWord}
              <ExternalLink
                aria-hidden
                className="mb-0.5 ml-1 inline h-3.5 w-3.5"
              />
            </span>
          </a>
        )}
      </TooltipTrigger>
      <TooltipContent side="top">{registry.category}</TooltipContent>
    </Tooltip>
  )
}
