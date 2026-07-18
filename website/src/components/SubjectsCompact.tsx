'use client'

import { SearchInput } from '@/components/SearchInput'
import { SubjectTreemap } from '@/components/SubjectTreemap'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SUBJECT_DOMAIN_LABELS } from '@/lib/filter-constants'
import { domainColor } from '@/lib/subjectDomainColors'
import { cn } from '@/lib/utils'
import type { SubjectDomain } from '@/types'
import { MousePointerClick, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

/**
 * Compact subjects widget for embedding on the main page: a 2-level domain
 * treemap on top (the overview + colour legend), a search box, then a "pill-map"
 * — the highest-count subjects as filter pills, tinted by domain and sorted so
 * same-domain pills cluster (domain names live only in tooltips).
 *
 * Default: the global top-N subjects across all domains. Select a domain in the
 * treemap → the pill-map swaps to that domain's own top subjects (so even
 * domains absent from the global top still reveal their heavy hitters). Search
 * always resolves the full set, ignoring the cap. Every pill links to the
 * explorer filtered to that subject.
 */

const GLOBAL_TOP = 150 // pills shown by default, across all domains
const DOMAIN_TOP = 60 // pills shown when a single domain is selected
const SEARCH_CAP = 300 // pills shown while searching

interface FlatLeaf {
  subject: string
  count: number
  code: string
}

interface SubjectsCompactProps {
  domains: SubjectDomain[]
}

export function SubjectsCompact({ domains }: SubjectsCompactProps) {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()

  // Domain display order (already count-sorted by getSubjectHierarchy); used to
  // cluster same-domain pills together.
  const domainOrder = useMemo(() => {
    const m = new Map<string, number>()
    domains.forEach((d, i) => m.set(d.code, i))
    return m
  }, [domains])

  // Flatten every leaf once, tagged with its domain (for colour + grouping).
  const allLeaves = useMemo<FlatLeaf[]>(() => {
    const out: FlatLeaf[] = []
    for (const d of domains) {
      for (const l of d.directSubjects)
        out.push({ subject: l.subject, count: l.count, code: d.code })
      for (const sd of d.subdomains)
        for (const l of sd.subjects)
          out.push({ subject: l.subject, count: l.count, code: d.code })
    }
    return out
  }, [domains])

  // The visible pill set, given search / domain-selection / default.
  const pills = useMemo<FlatLeaf[]>(() => {
    let pool = allLeaves
    let cap = GLOBAL_TOP
    if (term) {
      pool = allLeaves.filter((l) => l.subject.toLowerCase().includes(term))
      cap = SEARCH_CAP
    } else if (selectedDomain) {
      pool = allLeaves.filter((l) => l.code === selectedDomain)
      cap = DOMAIN_TOP
    }
    // Highest-count first, then cluster by domain for display.
    const top = [...pool].sort((a, b) => b.count - a.count).slice(0, cap)
    top.sort(
      (a, b) =>
        (domainOrder.get(a.code) ?? 99) - (domainOrder.get(b.code) ?? 99) ||
        b.count - a.count
    )
    return top
  }, [allLeaves, term, selectedDomain, domainOrder])

  const totalMatches = useMemo(() => {
    if (term)
      return allLeaves.filter((l) => l.subject.toLowerCase().includes(term))
        .length
    if (selectedDomain)
      return allLeaves.filter((l) => l.code === selectedDomain).length
    return allLeaves.length
  }, [allLeaves, term, selectedDomain])

  const selectedLabel = selectedDomain
    ? (SUBJECT_DOMAIN_LABELS[selectedDomain] ?? selectedDomain)
    : null

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <SubjectTreemap
          domains={domains}
          selectedDomain={selectedDomain}
          onSelectDomain={setSelectedDomain}
          height={300}
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="max-w-md min-w-48 flex-1">
            <SearchInput
              placeholder="Search all subjects..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              variant="border-bottom"
            />
          </div>
          {selectedLabel && !term && (
            <button
              type="button"
              onClick={() => setSelectedDomain(null)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white',
                domainColor(selectedDomain!).bg
              )}
            >
              {selectedLabel}
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {pills.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {pills.map((leaf) => (
              <SubjectPill key={`${leaf.code}-${leaf.subject}`} leaf={leaf} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No subjects match “{search.trim()}”.
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          {term
            ? `${totalMatches.toLocaleString()} matching subject${totalMatches === 1 ? '' : 's'}${
                totalMatches > pills.length ? ` (showing ${pills.length})` : ''
              }`
            : selectedDomain
              ? `Top ${pills.length} of ${totalMatches.toLocaleString()} ${selectedLabel} subjects — search to reach the rest`
              : `Top ${pills.length} subjects by document count — select a domain above or search to go deeper`}
        </p>
      </div>
    </TooltipProvider>
  )
}

function SubjectPill({ leaf }: { leaf: FlatLeaf }) {
  const color = domainColor(leaf.code)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={`/secretariat?subject=${encodeURIComponent(leaf.subject)}`}
          className={cn(
            'inline-flex items-baseline gap-1 rounded-full px-2.5 py-0.5 text-xs transition-[filter] hover:brightness-110',
            color.bg,
            color.text
          )}
        >
          <span className="font-medium">{leaf.subject}</span>
          <span className="text-[10px] opacity-80">{leaf.count}</span>
        </Link>
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
