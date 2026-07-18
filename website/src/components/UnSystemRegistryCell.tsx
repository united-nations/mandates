'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { UnSystemRegistry, UnSystemRegistryFeature } from '@/types'
import { Info } from 'lucide-react'
import Link from 'next/link'

const ALL_FEATURES: { key: UnSystemRegistryFeature; label: string }[] = [
  { key: 'sources', label: 'sources' },
  { key: 'searchable', label: 'searchable' },
  { key: 'in-force', label: 'in force' },
  { key: 'requests', label: 'requests' },
  { key: 'implementation', label: 'implementation' },
  { key: 'resources', label: 'resources' },
]

/** Four-step ordinal meter; the filled count (not color alone) carries the tier. */
function TierDots({ tier }: { tier: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`tier ${tier} of 4`}
    >
      {[1, 2, 3, 4].map((step) => (
        <span
          key={step}
          className={`h-1.5 w-1.5 rounded-full ${
            step <= tier ? 'bg-un-blue' : 'bg-un-blue/25'
          }`}
        />
      ))}
    </span>
  )
}

/**
 * Mandate-registry column cell: a link chip (category label + tier dot meter,
 * tooltip with the system's proper name and feature checklist), or an em dash
 * with an explanatory tooltip when the organization has no such system.
 */
export function UnSystemRegistryCell({
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

  const internal = registry.url.startsWith('/')
  const chipClass =
    'inline-flex items-center gap-1.5 rounded-md bg-un-blue/10 px-2 py-1 text-xs font-medium text-un-blue transition-colors hover:bg-un-blue/20'
  const chipContent = (
    <>
      <TierDots tier={registry.tier} />
      {registry.label}
    </>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {internal ? (
          <Link href={registry.url} className={chipClass}>
            {chipContent}
          </Link>
        ) : (
          <a
            href={registry.url}
            target="_blank"
            rel="noopener noreferrer"
            className={chipClass}
          >
            {chipContent}
          </a>
        )}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-80">
        <p className="text-sm font-medium">{registry.name}</p>
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
