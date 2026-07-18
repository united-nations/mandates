'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { UnSystemRegistry, UnSystemRegistryFeature } from '@/types'
import { ExternalLink, Info } from 'lucide-react'
import Link from 'next/link'

const ALL_FEATURES: { key: UnSystemRegistryFeature; label: string }[] = [
  { key: 'sources', label: 'sources' },
  { key: 'searchable', label: 'searchable' },
  { key: 'in-force', label: 'in force' },
  { key: 'requests', label: 'requests' },
  { key: 'implementation', label: 'implementation' },
  { key: 'resources', label: 'resources' },
]

const TIER_LABELS: Record<number, string> = {
  1: 'Document archive',
  2: 'In-force compilation',
  3: 'Resolutions database',
  4: 'Implementation tracker',
}

// Traffic-light ramp, worst→best; CVD-validated as a set in globals.css.
const TIER_COLORS: Record<number, string> = {
  1: 'bg-tier-1',
  2: 'bg-tier-2',
  3: 'bg-tier-3',
  4: 'bg-tier-4',
}

/** Four-step ordinal meter; the filled count (not color alone) carries the tier. */
function TierDots({ tier }: { tier: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`tier ${tier} of 4: ${TIER_LABELS[tier]}`}
    >
      {[1, 2, 3, 4].map((step) => (
        <span
          key={step}
          className={`h-1.5 w-1.5 rounded-full ${
            step <= tier ? TIER_COLORS[tier] : 'bg-gray-300'
          }`}
        />
      ))}
    </span>
  )
}

/** Tooltip body for the dots: the full tier ladder with this row highlighted. */
function TierLegend({ tier }: { tier: number }) {
  return (
    <ul className="space-y-1">
      {[1, 2, 3, 4].map((step) => (
        <li
          key={step}
          className={cn(
            'flex items-center gap-2 text-xs',
            step === tier ? 'font-semibold' : 'text-muted-foreground',
          )}
        >
          <TierDots tier={step} />
          {TIER_LABELS[step]}
        </li>
      ))}
    </ul>
  )
}

/**
 * Tier-meter column cell: the traffic-light dots with a ladder-legend
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
        <TierDots tier={registry.tier} />
      </TooltipTrigger>
      <TooltipContent side="top">
        <TierLegend tier={registry.tier} />
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Registry-link column cell: the system's proper name, with the taxonomy
 * category and feature checklist in the tooltip.
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
      <TooltipContent side="top" className="max-w-80">
        <p className="text-sm font-medium">{registry.category}</p>
        <p className="mt-1 text-xs">
          {ALL_FEATURES.map(({ key, label }, i) => (
            <span key={key}>
              {i > 0 && ' · '}
              <span
                className={
                  registry.features.includes(key)
                    ? ''
                    : 'text-muted-foreground line-through decoration-muted-foreground/50'
                }
              >
                {registry.features.includes(key) ? '✓ ' : ''}
                {label}
              </span>
            </span>
          ))}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
