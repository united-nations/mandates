'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { domainColor } from '@/lib/subjectDomainColors'
import { layoutGroups, squarify, type TreemapItem } from '@/lib/treemapLayout'
import { cn } from '@/lib/utils'
import type { SubjectDomain } from '@/types'
import { MousePointerClick } from 'lucide-react'
import { useMemo } from 'react'

/**
 * Two-level treemap of the subject domains, ported from the open.unfck treemap
 * system (self-contained slice-and-dice layout in lib/treemapLayout). Level 1 =
 * domain (its colour, from subjectDomainColors); level 2 = its sub-domains,
 * rendered as shade-graded tiles of the domain colour and sized by document
 * count. Purely proportional — small domains are small (no floor/log), which is
 * the point: what nobody cites stays small.
 *
 * Clicking anywhere in a domain selects that whole domain (its code) and lets
 * the parent filter the pill-map to it; clicking the active domain clears it.
 * The treemap doubles as the pill-map's colour legend.
 */

interface SubjectTreemapProps {
  domains: SubjectDomain[]
  selectedDomain: string | null
  onSelectDomain: (code: string | null) => void
  /** Fixed band height in px (width is fluid). */
  height?: number
}

interface Tile {
  domainCode: string
  domainLabel: string
  subLabel: string | null
  count: number
  /** 0 = largest tile in its domain (carries the domain name). */
  rankInDomain: number
  domainChildCount: number
  isDomainLabel: boolean
}

export function SubjectTreemap({
  domains,
  selectedDomain,
  onSelectDomain,
  height = 300,
}: SubjectTreemapProps) {
  const positioned = useMemo(() => {
    // Group = domain (sized by its doc count). Children = sub-domains, plus a
    // synthetic "General" child for subjects that sit directly under a domain.
    const groups = domains
      .filter((d) => d.count > 0)
      .map((d) => ({ key: d.code, total: d.count }))

    const childrenByDomain: Record<string, Tile[]> = {}
    for (const d of domains) {
      const kids: { subLabel: string | null; count: number }[] = [
        ...d.subdomains.map((sd) => ({ subLabel: sd.label, count: sd.count })),
      ]
      const directTotal = d.directSubjects.reduce((s, l) => s + l.count, 0)
      if (directTotal > 0) kids.push({ subLabel: null, count: directTotal })
      kids.sort((a, b) => b.count - a.count)
      childrenByDomain[d.code] = kids
        .filter((k) => k.count > 0)
        .map((k, i, arr) => ({
          domainCode: d.code,
          domainLabel: d.label,
          subLabel: k.subLabel,
          count: k.count,
          rankInDomain: i,
          domainChildCount: arr.length,
          isDomainLabel: i === 0,
        }))
    }

    const rects: Array<{ tile: Tile; x: number; y: number; w: number; h: number }> = []
    for (const gr of layoutGroups(groups)) {
      const items: TreemapItem<Tile>[] = (childrenByDomain[gr.key] ?? []).map(
        (t) => ({ value: t.count, data: t })
      )
      for (const r of squarify(items, gr.x, gr.y, gr.width, gr.height)) {
        rects.push({ tile: r.data, x: r.x, y: r.y, w: r.width, h: r.height })
      }
    }
    return rects
  }, [domains])

  return (
    <div className="relative w-full bg-muted/30" style={{ height }}>
      {positioned.map(({ tile, x, y, w, h }, i) => {
        const color = domainColor(tile.domainCode)
        const dimmed = selectedDomain !== null && selectedDomain !== tile.domainCode
        const active = selectedDomain === tile.domainCode
        // Level-2 shade: grade opacity by rank within the domain so sub-domains
        // read as tints of one hue. Then dim non-selected domains.
        const shade =
          tile.domainChildCount > 1
            ? 1 - (tile.rankInDomain / tile.domainChildCount) * 0.4
            : 1
        const opacity = dimmed ? shade * 0.28 : shade
        const showLabel = w > 7 && h > 5.5
        return (
          <Tooltip key={i} delayDuration={50} disableHoverableContent>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() =>
                  onSelectDomain(active ? null : tile.domainCode)
                }
                className={cn(
                  'absolute cursor-pointer overflow-hidden text-left transition-[left,top,width,height] duration-300 ease-in-out hover:z-10 hover:brightness-110',
                  color.bg,
                  color.text,
                  active && 'z-10 ring-2 ring-white ring-inset'
                )}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${w}%`,
                  height: `${h}%`,
                  opacity,
                }}
              >
                {showLabel && (
                  <span
                    className={cn(
                      'block px-1.5 py-1 leading-tight',
                      tile.isDomainLabel
                        ? 'text-[11px] font-semibold'
                        : 'text-[10px] opacity-90'
                    )}
                  >
                    {tile.isDomainLabel ? tile.domainLabel : tile.subLabel}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="font-semibold">{tile.domainLabel}</div>
              {tile.subLabel && (
                <div className="text-muted-foreground">{tile.subLabel}</div>
              )}
              <div className="mt-0.5">{tile.count.toLocaleString()} documents</div>
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
