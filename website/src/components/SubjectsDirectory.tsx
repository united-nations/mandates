'use client'

import { SearchInput } from '@/components/SearchInput'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { SubjectDomain, SubjectLeaf } from '@/types'
import { ChevronRight, MousePointerClick, Rows3, Tag } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

/**
 * The subject directory: every subject heading carried on a mandate document,
 * grouped by the UNBIS thesaurus (domain 01-18 -> sub-domain -> leaf subject).
 * Reads the same nested `SubjectDomain[]` the /subjects page fetches from
 * getSubjectHierarchy. Two view toggles, persisted in localStorage: compact
 * (dense pills) vs. full (cards), and whether to break each domain into its
 * sub-domains. Every leaf links to the explorer filtered to that subject; each
 * domain heading links to the explorer filtered to the whole domain.
 *
 * Domains stack vertically under a full-width, clickable heading. Their
 * sub-domain blocks flow across a balanced multi-column layout (each block kept
 * whole via break-inside-avoid) so the long tail of small sub-domains packs
 * densely without a giant single column.
 */

interface SubjectsDirectoryProps {
  domains: SubjectDomain[]
}

export function SubjectsDirectory({ domains }: SubjectsDirectoryProps) {
  const [search, setSearch] = useState('')
  const [compact, setCompact] = useState(true)
  const [showSubdomains, setShowSubdomains] = useState(true)

  // Restore saved preferences after mount (avoids an SSR hydration mismatch).
  useEffect(() => {
    const c = localStorage.getItem('subjects.compact')
    const s = localStorage.getItem('subjects.showSubdomains')
    if (c !== null) setCompact(c === '1')
    if (s !== null) setShowSubdomains(s === '1')
  }, [])
  useEffect(() => {
    localStorage.setItem('subjects.compact', compact ? '1' : '0')
  }, [compact])
  useEffect(() => {
    localStorage.setItem('subjects.showSubdomains', showSubdomains ? '1' : '0')
  }, [showSubdomains])

  const term = search.trim().toLowerCase()
  const matches = (leaf: SubjectLeaf) =>
    !term || leaf.subject.toLowerCase().includes(term)

  const totalSubjects = useMemo(() => countLeaves(domains), [domains])

  // Apply the search filter to each domain, dropping empties.
  const filtered = useMemo(() => {
    if (!term) return domains
    return domains
      .map((d) => {
        const directSubjects = d.directSubjects.filter(matches)
        const subdomains = d.subdomains
          .map((sd) => ({ ...sd, subjects: sd.subjects.filter(matches) }))
          .filter((sd) => sd.subjects.length > 0)
        return { ...d, directSubjects, subdomains }
      })
      .filter((d) => d.directSubjects.length > 0 || d.subdomains.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `matches` is a pure fn of `term`
  }, [domains, term])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="max-w-md min-w-48 flex-1">
            <SearchInput
              placeholder="Search subjects..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              variant="border-bottom"
            />
          </div>
          <Toggle
            active={showSubdomains}
            onClick={() => setShowSubdomains((v) => !v)}
            icon={Rows3}
          >
            Sub-domains
          </Toggle>
          <Toggle
            active={compact}
            onClick={() => setCompact((v) => !v)}
            icon={Tag}
          >
            Compact
          </Toggle>
        </div>

        {filtered.length > 0 ? (
          <div className="space-y-10">
            {filtered.map((domain) => (
              <DomainRegion
                key={domain.code}
                domain={domain}
                compact={compact}
                showSubdomains={showSubdomains}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No subjects match “{search.trim()}”.
          </p>
        )}

        {!term && (
          <p className="pt-2 text-xs text-muted-foreground">
            {totalSubjects.toLocaleString()} subjects across {domains.length}{' '}
            thesaurus domains.
          </p>
        )}
      </div>
    </TooltipProvider>
  )
}

function DomainRegion({
  domain,
  compact,
  showSubdomains,
}: {
  domain: SubjectDomain
  compact: boolean
  showSubdomains: boolean
}) {
  // When sub-domains are hidden, merge every leaf (direct + all sub-domains)
  // into one flat cloud for the domain.
  const flat = showSubdomains
    ? domain.directSubjects
    : [
        ...domain.directSubjects,
        ...domain.subdomains.flatMap((sd) => sd.subjects),
      ].sort((a, b) => b.count - a.count)

  return (
    <section>
      <DomainHeading domain={domain} />
      {flat.length > 0 && (
        <div className="mt-3">
          <LeafGroup leaves={flat} compact={compact} />
        </div>
      )}
      {showSubdomains && domain.subdomains.length > 0 && (
        <div className="mt-3 gap-x-8 md:columns-2 lg:columns-3">
          {domain.subdomains.map((sd) => (
            <div key={sd.label} className="mb-4 break-inside-avoid">
              <SubHeading>{sd.label}</SubHeading>
              <div className="mt-1.5">
                <LeafGroup leaves={sd.subjects} compact={compact} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function DomainHeading({ domain }: { domain: SubjectDomain }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={`/secretariat?subject_domain=${domain.code}`}
          className="group inline-flex items-baseline gap-2 border-b border-border pb-1.5"
        >
          <h2 className="text-sm font-semibold tracking-wide text-un-blue uppercase group-hover:underline">
            {domain.label}
          </h2>
          <span className="text-xs text-muted-foreground">
            {domain.count.toLocaleString()}
          </span>
        </Link>
      </TooltipTrigger>
      <ClickTooltip name={`All ${domain.label} mandates`} />
    </Tooltip>
  )
}

function Toggle({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Rows3
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
          : 'bg-muted text-muted-foreground hover:bg-accent'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-muted-foreground">{children}</p>
}

function LeafGroup({
  leaves,
  compact,
}: {
  leaves: SubjectLeaf[]
  compact: boolean
}) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {leaves.map((leaf) => (
          <SubjectPill key={leaf.subject} leaf={leaf} />
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {leaves.map((leaf) => (
        <SubjectCard key={leaf.subject} leaf={leaf} />
      ))}
    </div>
  )
}

/** Wraps a subject link in the shared hover tooltip (click hint). */
function SubjectLink({
  leaf,
  className,
  children,
}: {
  leaf: SubjectLeaf
  className: string
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={`/secretariat?subject=${encodeURIComponent(leaf.subject)}`}
          className={className}
        >
          {children}
        </Link>
      </TooltipTrigger>
      <ClickTooltip />
    </Tooltip>
  )
}

function ClickTooltip({ name }: { name?: string | null }) {
  return (
    <TooltipContent side="top" className="max-w-xs">
      {name && <div className="font-medium">{name}</div>}
      <div className="mt-0.5 flex items-center gap-1 text-un-blue">
        <MousePointerClick className="h-3.5 w-3.5" />
        Click to show mandates
      </div>
    </TooltipContent>
  )
}

function SubjectPill({ leaf }: { leaf: SubjectLeaf }) {
  return (
    <SubjectLink
      leaf={leaf}
      className="inline-flex items-baseline gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs transition-colors hover:bg-accent"
    >
      <span className="font-medium">{leaf.subject}</span>
      <span className="text-[10px] text-muted-foreground">{leaf.count}</span>
    </SubjectLink>
  )
}

function SubjectCard({ leaf }: { leaf: SubjectLeaf }) {
  return (
    <SubjectLink
      leaf={leaf}
      className="group flex items-start justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2 transition-colors hover:bg-muted"
    >
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm font-medium">{leaf.subject}</span>
        <span className="text-[10px] text-muted-foreground">{leaf.count}</span>
      </div>
      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-un-blue" />
    </SubjectLink>
  )
}

function countLeaves(domains: SubjectDomain[]): number {
  const seen = new Set<string>()
  for (const d of domains) {
    for (const leaf of d.directSubjects) seen.add(leaf.subject)
    for (const sd of d.subdomains)
      for (const leaf of sd.subjects) seen.add(leaf.subject)
  }
  return seen.size
}
