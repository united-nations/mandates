'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { domainColor } from '@/lib/subjectDomainColors'
import { squarify } from '@/lib/treemapLayout'
import { cn } from '@/lib/utils'
import type { SubjectDomain } from '@/types'
import { MousePointerClick } from 'lucide-react'
import { useMemo } from 'react'

/**
 * Two-level treemap of the subject domains. The layout is a free nested
 * squarify (ported from the open.unfck treemap engine, lib/treemapLayout) — the
 * 18 domains are squarified into the whole area (not stacked into full-width
 * rows), and each domain is itself subdivided into its sub-domains, SDG-treemap
 * style: one hue per domain, sub-domains as delineated sub-tiles of that hue
 * with a label. Purely proportional — small domains stay small.
 *
 * The sub-domain is the unit of interaction: domains group and colour the tiles
 * but carry no label of their own (the domain name lives in the tooltip, and the
 * shared hue does the grouping work). Clicking a sub-tile selects it, filtering
 * the pill-map below; clicking the active one clears it.
 */

interface SubjectTreemapProps {
  domains: SubjectDomain[]
  /** Key of the selected sub-domain, see subdomainKey(). */
  selected: string | null
  onSelect: (key: string | null) => void
  /** Fixed band height in px (width is fluid). */
  height?: number
}

/**
 * Stable identity for one sub-domain. Sub-domain labels are only unique within
 * a domain, and the leftover leaves that map to no sub-domain (label `null`)
 * need a slot of their own.
 */
export function subdomainKey(code: string, label: string | null): string {
  return `${code}::${label ?? ''}`
}

/** Display name for a sub-tile, including the no-sub-domain leftovers. */
export function subdomainLabel(label: string | null): string {
  return label ?? 'Other subjects'
}

interface SubTile {
  label: string | null
  count: number
  x: number
  y: number
  w: number
  h: number
}

export function SubjectTreemap({
  domains,
  selected,
  onSelect,
  height = 390,
}: SubjectTreemapProps) {
  // Level 1: squarify the domains into the whole area. Level 2: squarify each
  // domain's sub-domains within its own rectangle (local 0–100 coordinates).
  const layout = useMemo(() => {
    const domainItems = domains
      .filter((d) => d.count > 0)
      .map((d) => ({ value: d.count, data: d }))

    return squarify(domainItems, 0, 0, 100, 100).map((r) => {
      const d = r.data
      const kids: { label: string | null; count: number }[] = [
        ...d.subdomains.map((sd) => ({ label: sd.label, count: sd.count })),
      ]
      const directTotal = d.directSubjects.reduce((s, l) => s + l.count, 0)
      if (directTotal > 0) kids.push({ label: null, count: directTotal })
      kids.sort((a, b) => b.count - a.count)

      const subTiles: SubTile[] = squarify(
        kids
          .filter((k) => k.count > 0)
          .map((k) => ({ value: k.count, data: k })),
        0,
        0,
        100,
        100
      ).map((sr) => ({
        label: sr.data.label,
        count: sr.data.count,
        x: sr.x,
        y: sr.y,
        w: sr.width,
        h: sr.height,
      }))

      return { domain: d, rect: r, subTiles }
    })
  }, [domains])

  return (
    <div className="relative w-full bg-muted/20" style={{ height }}>
      {layout.map(({ domain, rect, subTiles }) => {
        const color = domainColor(domain.code)
        return (
          // The domain rectangle itself is only a container: it bounds and
          // colours its sub-tiles, but is not selectable or labelled.
          <div
            key={domain.code}
            className="absolute overflow-hidden"
            style={{
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.width}%`,
              height: `${rect.height}%`,
            }}
          >
            {subTiles.map((s) => {
              const key = subdomainKey(domain.code, s.label)
              const active = selected === key
              const dimmed = selected !== null && !active
              const showLabel = s.w > 16 && s.h > 12
              return (
                <Tooltip key={key} delayDuration={50} disableHoverableContent>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onSelect(active ? null : key)}
                      className={cn(
                        'absolute cursor-pointer overflow-hidden text-left ring-1 ring-white/25 transition-opacity duration-300 ease-in-out ring-inset hover:z-20 hover:brightness-110',
                        color.bg,
                        color.text,
                        active && 'z-10 ring-2 ring-white',
                        dimmed && 'opacity-30'
                      )}
                      style={{
                        left: `${s.x}%`,
                        top: `${s.y}%`,
                        width: `${s.w}%`,
                        height: `${s.h}%`,
                      }}
                    >
                      {showLabel && (
                        <span className="absolute bottom-0 left-0 px-1 py-0.5 text-[11px] leading-tight opacity-90">
                          {subdomainLabel(s.label)}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="text-[11px] text-muted-foreground">
                      {domain.label}
                    </div>
                    <div className="font-semibold">
                      {subdomainLabel(s.label)}
                    </div>
                    <div className="mt-0.5">
                      {s.count.toLocaleString()} documents
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-un-blue">
                      <MousePointerClick className="h-3.5 w-3.5" />
                      {active ? 'Click to clear' : 'Click to filter subjects'}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
