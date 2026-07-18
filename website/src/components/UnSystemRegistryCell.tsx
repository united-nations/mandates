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
  return POINT_ORDER.reduce(
    (sum, key) =>
      sum +
      (registry.points[key] === true
        ? 1
        : registry.points[key] === 'partial'
          ? 0.5
          : 0),
    0,
  )
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
        'h-1.5 w-1.5 rounded-full',
        value === true && FILLED[step],
        value === 'partial' && `border bg-transparent ${RING[step]}`,
        value === false && 'bg-gray-300',
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
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`${total} of 5 points`}
    >
      {POINT_ORDER.map((key) => (
        <Dot key={key} value={registry.points[key]} step={step} />
      ))}
    </span>
  )
}

/** Tooltip body: the five points by name with this organization's state. */
function PointLegend({ registry }: { registry: UnSystemRegistry }) {
  const step = colorStep(score(registry))
  return (
    <div>
      <p className="text-sm font-medium">{score(registry)} of 5 points</p>
      <ul className="mt-1 space-y-1">
        {POINT_ORDER.map((key) => {
          const value = registry.points[key]
          return (
            <li
              key={key}
              className={cn(
                'flex items-center gap-2 text-xs',
                value === false && 'text-muted-foreground',
              )}
            >
              <Dot value={value} step={step} />
              {POINT_LABELS[key]}
              {value === 'partial' && ' (partial)'}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Point-meter column cell: the traffic-light dots with a point-breakdown
 * tooltip — or an em dash with an explanatory tooltip when the organization
 * has no registry-like system.
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
          className="inline-flex cursor-help items-center gap-1 text-sm text-muted-foreground"
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
      <TooltipContent side="top">
        <PointLegend registry={registry} />
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Registry-link column cell: the system's proper name, with the taxonomy
 * category in the tooltip.
 */
export function UnSystemRegistryLink({
  registry,
}: {
  registry: UnSystemRegistry | null
}) {
  if (!registry) return null

  const internal = registry.url.startsWith('/')
  const linkClass =
    'inline-flex items-center gap-1 text-sm text-un-blue hover:underline'

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
            {registry.name}
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        )}
      </TooltipTrigger>
      <TooltipContent side="top">{registry.category}</TooltipContent>
    </Tooltip>
  )
}
