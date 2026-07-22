'use client'

import {
  SubjectTreemap,
  subdomainKey,
  subdomainLabel,
} from '@/components/SubjectTreemap'
import { ChartSearchInput } from '@/components/ui/chart-search-input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSectionFilter } from '@/hooks/use-section-filter'
import { SUBJECT_DOMAIN_LABELS } from '@/lib/filter-constants'
import { domainColor } from '@/lib/subjectDomainColors'
import { cn } from '@/lib/utils'
import type { SubjectDomain } from '@/types'
import { MousePointerClick, X } from 'lucide-react'
import { useMemo, useState } from 'react'

/**
 * Compact subjects widget for embedding on the main page: a 2-level domain
 * treemap on top (the overview + colour legend), a search box, then a "pill-map"
 * — the highest-count subjects as filter pills, tinted by domain and sorted so
 * same-domain pills cluster (domain names live only in tooltips).
 *
 * Default: the global top-N subjects across all domains. Select a sub-domain in
 * the treemap → the pill-map swaps to that sub-domain's own top subjects (so
 * even sub-domains absent from the global top still reveal their heavy hitters).
 * Search always resolves the full set, ignoring the cap. Every pill links to the
 * explorer filtered to that subject.
 */

const DEFAULT_TOP = 30 // pills shown by default and when a sub-domain is selected
const SEARCH_CAP = 300 // pills shown while searching

interface FlatLeaf {
  subject: string
  count: number
  /** Domain code — drives the pill colour and the display clustering. */
  code: string
  /** Sub-domain key — the unit the treemap selects on. */
  sub: string
}

interface SubjectsCompactProps {
  domains: SubjectDomain[]
}

export function SubjectsCompact({ domains }: SubjectsCompactProps) {
  const [selectedSub, setSelectedSub] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()
  const { active, select } = useSectionFilter('subject')

  // Domain display order (already count-sorted by getSubjectHierarchy); used to
  // cluster same-domain pills together.
  const domainOrder = useMemo(() => {
    const m = new Map<string, number>()
    domains.forEach((d, i) => m.set(d.code, i))
    return m
  }, [domains])

  // Flatten every leaf once, tagged with its domain (for colour + grouping) and
  // its sub-domain (the treemap's selection unit).
  const allLeaves = useMemo<FlatLeaf[]>(() => {
    const out: FlatLeaf[] = []
    for (const d of domains) {
      for (const l of d.directSubjects)
        out.push({
          subject: l.subject,
          count: l.count,
          code: d.code,
          sub: subdomainKey(d.code, null),
        })
      for (const sd of d.subdomains)
        for (const l of sd.subjects)
          out.push({
            subject: l.subject,
            count: l.count,
            code: d.code,
            sub: subdomainKey(d.code, sd.label),
          })
    }
    return out
  }, [domains])

  // Display name + domain colour for whichever sub-domain is selected.
  const subMeta = useMemo(() => {
    const m = new Map<string, { label: string; code: string }>()
    for (const d of domains) {
      m.set(subdomainKey(d.code, null), {
        label: `${d.label} — ${subdomainLabel(null).toLowerCase()}`,
        code: d.code,
      })
      for (const sd of d.subdomains)
        m.set(subdomainKey(d.code, sd.label), { label: sd.label, code: d.code })
    }
    return m
  }, [domains])

  // The visible pill set, given search / sub-domain selection / default.
  const pills = useMemo<FlatLeaf[]>(() => {
    let pool = allLeaves
    let cap = DEFAULT_TOP
    if (term) {
      pool = allLeaves.filter((l) => l.subject.toLowerCase().includes(term))
      cap = SEARCH_CAP
    } else if (selectedSub) {
      pool = allLeaves.filter((l) => l.sub === selectedSub)
    }
    // Highest-count first, then cluster by domain for display.
    const top = [...pool].sort((a, b) => b.count - a.count).slice(0, cap)
    top.sort(
      (a, b) =>
        (domainOrder.get(a.code) ?? 99) - (domainOrder.get(b.code) ?? 99) ||
        b.count - a.count
    )
    return top
  }, [allLeaves, term, selectedSub, domainOrder])

  const totalMatches = useMemo(() => {
    if (term)
      return allLeaves.filter((l) => l.subject.toLowerCase().includes(term))
        .length
    if (selectedSub)
      return allLeaves.filter((l) => l.sub === selectedSub).length
    return allLeaves.length
  }, [allLeaves, term, selectedSub])

  const selectedMeta = selectedSub ? subMeta.get(selectedSub) : undefined
  const overflow = Math.max(0, totalMatches - pills.length)

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <SubjectTreemap
          domains={domains}
          selected={selectedSub}
          onSelect={setSelectedSub}
          height={390}
        />

        <div className="flex flex-wrap items-center gap-3">
          <ChartSearchInput
            placeholder="Search all subjects..."
            value={search}
            onChange={setSearch}
          />
          {selectedMeta && !term && (
            <button
              type="button"
              onClick={() => setSelectedSub(null)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white',
                domainColor(selectedMeta.code).bg
              )}
            >
              {selectedMeta.label}
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {pills.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {pills.map((leaf) => (
              <SubjectPill
                key={`${leaf.sub}-${leaf.subject}`}
                leaf={leaf}
                active={active === leaf.subject}
                onSelect={select}
              />
            ))}
            {overflow > 0 && (
              <span className="inline-flex items-baseline rounded-full border border-dashed border-gray-300 bg-transparent px-2.5 py-0.5 text-xs text-gray-500">
                +{overflow.toLocaleString()}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No subjects match “{search.trim()}”.
          </p>
        )}

        {pills.length > 0 && (
          <p className="text-sm text-gray-600">
            {term
              ? `${totalMatches.toLocaleString()} matching subject${totalMatches === 1 ? '' : 's'}`
              : selectedMeta
                ? 'search to reach the rest'
                : 'select a topic group above or search to go deeper'}
          </p>
        )}
      </div>
    </TooltipProvider>
  )
}

/** Display fix: subject labels are title-cased, so the abbreviation "UN" comes
 *  through as "Un" ("Coordination Within Un System"). Uppercase the standalone
 *  word for display only — the filter/link value stays the raw subject. */
function formatSubjectLabel(subject: string): string {
  return subject.replace(/\bUn\b/g, 'UN')
}

function SubjectPill({
  leaf,
  active,
  onSelect,
}: {
  leaf: FlatLeaf
  active: boolean
  onSelect: (value: string) => void
}) {
  const color = domainColor(leaf.code)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={`/secretariat?subject=${encodeURIComponent(leaf.subject)}`}
          onClick={(e) => {
            e.preventDefault()
            onSelect(leaf.subject)
          }}
          className={cn(
            'inline-flex items-baseline gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-700 transition-colors hover:bg-gray-100',
            active && 'ring-2 ring-un-blue ring-offset-1'
          )}
        >
          <span className="font-medium">{formatSubjectLabel(leaf.subject)}</span>
          <span
            aria-hidden
            className="size-1.5 self-center rounded-full"
            style={{ backgroundColor: color.hex }}
          />
          <span className="text-[10px] text-gray-500">{leaf.count}</span>
        </a>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="font-medium">
          {SUBJECT_DOMAIN_LABELS[leaf.code] ?? leaf.code}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-un-blue">
          <MousePointerClick className="h-3.5 w-3.5" />
          Click to show mandates
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
