'use client'

import { ChartSearchInput } from '@/components/ui/chart-search-input'
import { Chip, ChipCount } from '@/components/ui/chip'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SUBJECT_DOMAIN_LABELS } from '@/lib/filter-constants'
import type {
  DirectorySelection,
  DocumentTypeCatalogue,
  SubjectDomain,
} from '@/types'
import { MousePointerClick } from 'lucide-react'
import { useMemo, useState } from 'react'

/**
 * The documents panel: the two ways into the document catalogue, stacked in one
 * column — what kind of document it is (ppb_type) first, then what it is about
 * (UNBIS subject headings). Both are filters: a click adds that facet to the
 * active filters and closes the modal.
 *
 * Every count here describes the WHOLE catalogue under the other active filters
 * (getDocumentTypeCatalogue / getSubjectHierarchy at mode=all_resolutions), which
 * is the number on the tile above. Selecting a pill therefore also puts the table
 * in that scope — the write is injected by DirectoryExplorer (DirectorySelection)
 * rather than taken from the URL, precisely so the two cannot drift.
 *
 * The type list is NOT a complete partition of the catalogue: ppb_type was never
 * populated for documents that only exist in the PPB-2027 import, so more than
 * half of them carry no recorded type. That gap is stated in plain language
 * under the type list rather than quietly dropped, which is what the previous
 * `WHERE ppb_type IS NOT NULL` facet query did.
 */

const DEFAULT_TOP = 30 // subject pills shown by default
const SEARCH_CAP = 300 // subject pills shown while searching

interface FlatLeaf {
  subject: string
  count: number
  /** Domain code — drives the pill colour and the domain named in its tooltip. */
  code: string
  /** Sub-domain key — kept to make the React key unique per leaf. */
  sub: string
}

interface DocumentsDirectoryProps {
  domains: SubjectDomain[]
  documentTypes: DocumentTypeCatalogue
  selection: DirectorySelection
}

export function DocumentsDirectory({
  domains,
  documentTypes,
  selection,
}: DocumentsDirectoryProps) {
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()
  const active = selection.active('subject')
  const select = (value: string) => selection.select('subject', value)
  const activeType = selection.active('document_type')
  const selectType = (value: string) => selection.select('document_type', value)

  // Flatten every leaf once, tagged with its domain (drives the pill colour and
  // the domain named in the pill's tooltip).
  const allLeaves = useMemo<FlatLeaf[]>(() => {
    const out: FlatLeaf[] = []
    for (const d of domains) {
      for (const l of d.directSubjects)
        out.push({
          subject: l.subject,
          count: l.count,
          code: d.code,
          sub: `${d.code}::`,
        })
      for (const sd of d.subdomains)
        for (const l of sd.subjects)
          out.push({
            subject: l.subject,
            count: l.count,
            code: d.code,
            sub: `${d.code}::${sd.label}`,
          })
    }
    return out
  }, [domains])

  // The visible pill set, given search / default. Ordered by count, globally,
  // with no re-sort afterwards: the list is a "most common subjects" list, so a
  // monotonically falling count is the one ordering a reader can verify at a
  // glance. It used to be re-clustered by domain after the top-N cut, which
  // buried the two largest subjects mid-list and made the counts read as random —
  // and the only cue for the grouping was a 6px coloured dot with no legend.
  // That dot is gone too, so the domain is now named in words in each pill's
  // tooltip, which is where it is actually legible.
  const pills = useMemo<FlatLeaf[]>(() => {
    const pool = term
      ? allLeaves.filter((l) => l.subject.toLowerCase().includes(term))
      : allLeaves
    const cap = term ? SEARCH_CAP : DEFAULT_TOP
    return [...pool]
      .sort((a, b) => b.count - a.count || a.subject.localeCompare(b.subject))
      .slice(0, cap)
  }, [allLeaves, term])

  const totalMatches = term
    ? allLeaves.filter((l) => l.subject.toLowerCase().includes(term)).length
    : allLeaves.length
  const overflow = Math.max(0, totalMatches - pills.length)

  const hint = term
    ? `${totalMatches.toLocaleString()} matching subject${totalMatches === 1 ? '' : 's'}`
    : 'Search to go beyond the most common subjects'

  const { types, untypedCount, totalCount } = documentTypes
  const untypedShare =
    totalCount > 0 ? Math.round((untypedCount / totalCount) * 1000) / 10 : 0

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-8">
        <section className="space-y-3">
          <SectionHeading>Document types</SectionHeading>
          {types.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {types.map((type) => (
                <TypePill
                  key={type.value}
                  label={type.value}
                  count={type.count}
                  active={
                    activeType?.toLowerCase() === type.value.toLowerCase()
                  }
                  onSelect={() => selectType(type.value)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recorded document types.</p>
          )}
          {untypedCount > 0 && (
            <p className="text-xs text-gray-500">
              The type is only recorded for{' '}
              {(totalCount - untypedCount).toLocaleString()} of the{' '}
              {totalCount.toLocaleString()} documents. The remaining{' '}
              {untypedCount.toLocaleString()} ({untypedShare}%) have no recorded
              type and are not covered by any of the buttons above.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeading>Subjects</SectionHeading>
          <ChartSearchInput
            placeholder="Search all subjects..."
            value={search}
            onChange={setSearch}
          />

          {pills.length > 0 ? (
            <div className="flex flex-wrap items-start gap-x-1 gap-y-1.5">
              {pills.map((leaf) => (
                <SubjectPill
                  key={`${leaf.sub}-${leaf.subject}`}
                  leaf={leaf}
                  active={active === leaf.subject}
                  onSelect={select}
                />
              ))}
              {overflow > 0 && (
                <Chip tone="ghost">+{overflow.toLocaleString()}</Chip>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No subjects match “{search.trim()}”.
            </p>
          )}

          <p className="text-xs text-gray-500">{hint}</p>
        </section>
      </div>
    </TooltipProvider>
  )
}

/** h3, not h2: the dialog's own DialogTitle is the h2 of this subtree. */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b border-gray-200 pb-1.5 text-sm font-normal tracking-wide text-gray-600 uppercase">
      {children}
    </h3>
  )
}

function TypePill({
  label,
  count,
  active,
  onSelect,
}: {
  label: string
  count: number
  active: boolean
  onSelect: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Chip
          tone={active ? 'selected' : 'neutral'}
          href={`/secretariat?document_type=${encodeURIComponent(label)}`}
          onClick={(e) => {
            e.preventDefault()
            onSelect()
          }}
        >
          <span className="font-medium">{label}</span>
          <ChipCount tone={active ? 'selected' : 'neutral'}>
            {count.toLocaleString()}
          </ChipCount>
        </Chip>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="flex items-center gap-1 text-un-blue">
          <MousePointerClick className="h-3.5 w-3.5" />
          Click to show mandates
        </div>
      </TooltipContent>
    </Tooltip>
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
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Active is a FILL, not a ring: this pill used to mark selection with
            `ring-2 ring-un-blue ring-offset-1`, which is the identical
            treatment its own focus-visible state uses — so a keyboard user
            could not tell "this one is focused" from "this one is filtering". */}
        <Chip
          tone={active ? 'selected' : 'neutral'}
          href={`/secretariat?subject=${encodeURIComponent(leaf.subject)}`}
          onClick={(e) => {
            e.preventDefault()
            onSelect(leaf.subject)
          }}
        >
          <span className="font-medium">
            {formatSubjectLabel(leaf.subject)}
          </span>
          <ChipCount tone={active ? 'selected' : 'neutral'}>
            {leaf.count.toLocaleString()}
          </ChipCount>
        </Chip>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {/* The domain is a level up in the same taxonomy, so under a section
            headed "Subjects" a bare domain name reads as another subject. The
            qualifier is the one the active-filter bar already uses. */}
        <div className="font-medium">
          Subject domain: {SUBJECT_DOMAIN_LABELS[leaf.code] ?? leaf.code}
        </div>
        <div className="mt-0.5 text-xs text-gray-500">
          {leaf.count.toLocaleString()} document
          {leaf.count === 1 ? '' : 's'}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-un-blue">
          <MousePointerClick className="h-3.5 w-3.5" />
          Click to show mandates
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
