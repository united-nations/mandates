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
 * Clicking a domain selects it (parent filters the pill-map to it); clicking the
 * active domain clears it. The treemap doubles as the pill-map's colour legend.
 */

interface SubjectTreemapProps {
  domains: SubjectDomain[]
  selectedDomain: string | null
  onSelectDomain: (code: string | null) => void
  /** Fixed band height in px (width is fluid). */
  height?: number
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
  selectedDomain,
  onSelectDomain,
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
        kids.filter((k) => k.count > 0).map((k) => ({ value: k.count, data: k })),
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
        const dimmed = selectedDomain !== null && selectedDomain !== domain.code
        const active = selectedDomain === domain.code
        const showDomainLabel = rect.width > 9 && rect.height > 7
        return (
          <Tooltip key={domain.code} delayDuration={50} disableHoverableContent>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onSelectDomain(active ? null : domain.code)}
                className={cn(
                  'absolute cursor-pointer overflow-hidden text-left transition-[left,top,width,height,opacity] duration-300 ease-in-out hover:z-20 hover:brightness-110',
                  color.bg,
                  color.text,
                  active && 'z-10 ring-2 ring-white ring-inset',
                  dimmed && 'opacity-30'
                )}
                style={{
                  left: `${rect.x}%`,
                  top: `${rect.y}%`,
                  width: `${rect.width}%`,
                  height: `${rect.height}%`,
                }}
              >
                {/* Level-2 sub-tiles: same hue, delineated by a thin inset rule. */}
                {subTiles.map((s, i) => {
                  const showSub = s.w > 16 && s.h > 12
                  return (
                    <div
                      key={i}
                      className={cn(
                        'absolute overflow-hidden ring-1 ring-white/25 ring-inset',
                        color.bg
                      )}
                      style={{
                        left: `${s.x}%`,
                        top: `${s.y}%`,
                        width: `${s.w}%`,
                        height: `${s.h}%`,
                      }}
                    >
                      {showSub && s.label && (
                        <span className="absolute bottom-0 left-0 px-1 py-0.5 text-[11px] leading-tight opacity-90">
                          {s.label}
                        </span>
                      )}
                    </div>
                  )
                })}

                {/* Domain label overlay: a solid colour box (SDG-treemap style)
                    so it stays legible even where it sits over sub-tiles. */}
                {showDomainLabel && (
                  <span
                    className={cn(
                      'pointer-events-none absolute top-0 left-0 z-10 block max-w-full px-1.5 py-1 text-[14px] font-semibold leading-tight',
                      color.bg,
                      color.text
                    )}
                  >
                    {domain.label}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="font-semibold">{domain.label}</div>
              <div className="mt-0.5">{domain.count.toLocaleString()} documents</div>
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
}
