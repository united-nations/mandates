'use client'

import { useCallback, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'

import { DocumentsDirectory } from '@/components/DocumentsDirectory'
import { EntitiesDirectory } from '@/components/EntitiesDirectory'
import { OrgansDirectory } from '@/components/OrgansDirectory'
import {
  BudgetStreamTree,
  type BudgetTreeLevel,
} from '@/components/table/BudgetStreamTree'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DirectorySelectContext } from '@/contexts/DirectorySelectContext'
import { useFilters } from '@/contexts/FilterContext'
import type { FilterParamKey } from '@/lib/filter-constants'
import { cn } from '@/lib/utils'
import type {
  BudgetStream,
  DirectoryFilterKey,
  DirectorySelection,
  DocumentTypeCatalogue,
  FilterOptions,
  OrganGroup,
  SubjectDomain,
} from '@/types'

type Panel = 'organs' | 'catalogue' | 'cited' | 'entities'

interface DirectoryExplorerProps {
  organGroups: OrganGroup[]
  budgetStreams: BudgetStream[]
  subjectDomains: SubjectDomain[]
  documentTypes: DocumentTypeCatalogue
  /** Distinct organs in the result set. */
  organCount: number
  /** Distinct citing entities in the result set. */
  entityCount: number
  /** Documents under the active filters with `cited` ignored. */
  allDocumentsCount: number
  /** Documents under the active filters with `cited` on. */
  citedDocumentCount: number
  versions: { slug: string; ppb_year: number; display_name: string }[]
  /** The version card 3 describes: ?ppb_version, else the DB default. */
  activeVersionSlug: string
}

// Neutralises the shadcn dialog's directional slide-in so the modal grows from
// the centre (a plain zoom + fade) instead of flying in from the top-left.
const CENTER_MODAL_STYLE = {
  '--tw-enter-translate-x': '0px',
  '--tw-enter-translate-y': '0px',
  '--tw-exit-translate-x': '0px',
  '--tw-exit-translate-y': '0px',
} as React.CSSProperties

/**
 * Dimension groups. Selecting a value inside a panel clears its whole group
 * before setting the new value.
 *
 * INVARIANT, and the only thing keeping these tiles honest: each group here must
 * be exactly the set of params the query behind that panel drops before counting
 * (see omitOwnDimension / the `delete scoped.*` blocks in lib/data/mandates.ts).
 * A count computed with X ignored, applied on top of an X that is still active,
 * returns fewer rows than the number the user clicked.
 *
 *   organ         -> getOrganHierarchy            drops `organ`
 *   subject       -> getSubjectHierarchy          drops `subject`, `subject_domain`
 *   document_type -> getDocumentTypeCatalogue     drops `document_type`
 *   budget levels -> getBudgetHierarchy           drops the five levels + `programme`
 */
const DIMENSION_GROUPS: FilterParamKey[][] = [
  ['organ'],
  ['subject', 'subject_domain'],
  ['document_type'],
  // `programme` is legacy (superseded by section, reachable only from old
  // ?programme= links) but belongs to this group so it cannot linger.
  [
    'budget_document',
    'budget_part',
    'section',
    'entity',
    'subprogramme',
    'programme',
  ],
]

/** Which filter param each level of the budget tree writes to. */
const BUDGET_LEVEL_PARAM: Record<BudgetTreeLevel, FilterParamKey> = {
  stream: 'budget_document',
  part: 'budget_part',
  section: 'section',
  entity: 'entity',
  subprogramme: 'subprogramme',
}

/**
 * The four entry points at the top of the mandate explorer. Each states one fact
 * about the CURRENT filter selection as a sentence — "22 organs creating
 * mandates" — and doubles as a gateway: clicking it opens the matching directory
 * or filter panel.
 *
 * ONE rule: every card number honours every active filter, its own dimension
 * included. Each states what the table below is showing — filter to one organ
 * and card 1 reads 1. Nothing is pinned to a scope, so every selection is
 * purely ADDITIVE: it keeps the other filters and changes exactly the one
 * dimension it names.
 *
 * The four numbers, all over the current result set:
 *
 *   1. organs creating mandates       — distinct organs in it
 *   2. documents adopted              — the table total
 *   3. documents cited as mandates    — the cited subset of it
 *   4. entities implementing mandates — distinct citing entities in it
 *
 * The panels' option LISTS are the one place the own dimension is dropped, and
 * only there: a list that collapsed to the value already chosen could never be
 * used to choose anything else (see DIMENSION_GROUPS). Card 1 can therefore
 * read 1 while its panel still lists all 22 organs — the card reports, the
 * panel offers. For the same reason the "All documents" option in card 3's
 * chooser states the count it would produce rather than the current one.
 *
 * Every number is read through ONE budget version, chosen in card 3's panel.
 * That choice is a lens, not a filter: the list always covers the whole
 * catalogue unified with what the selected version cites, and the version
 * decides which citations — counts, entities, budget locations — are attached
 * to those documents. Switching it therefore moves every number on the page.
 *
 * Styling follows the UN Transparency Portal: a white tile with a grey border,
 * un-blue used only as an accent on hover, shadow on hover only, everything
 * left-aligned. No leading icons — the number is the anchor.
 */
export function DirectoryExplorer({
  organGroups,
  budgetStreams,
  subjectDomains,
  documentTypes,
  organCount,
  entityCount,
  allDocumentsCount,
  citedDocumentCount,
  versions,
  activeVersionSlug,
}: DirectoryExplorerProps) {
  const { filters, setMultipleFilters } = useFilters()
  const [panel, setPanel] = useState<Panel | null>(null)
  const close = useCallback(() => setPanel(null), [])

  const isCitedOnly = filters.cited === '1'
  // Card 2 is the table total, so it reads whichever of the two document counts
  // the active filters select.
  const tableDocumentCount = isCitedOnly ? citedDocumentCount : allDocumentsCount
  const activeVersion = versions.find((v) => v.slug === activeVersionSlug)
  const citedPredicate = activeVersion
    ? `cited as mandates in PPB ${activeVersion.ppb_year}`
    : 'cited as mandates in the budget'

  /** Write one dimension, keeping every other active filter. */
  const applySelection = useCallback(
    (param: FilterParamKey, value: string | undefined) => {
      const updates: Record<string, string | undefined> = {}
      // Clear the param's own dimension group — every count in the panel was
      // computed with that whole group ignored.
      for (const group of DIMENSION_GROUPS) {
        if (group.includes(param))
          for (const key of group) updates[key] = undefined
      }
      updates[param] = value
      updates.page = undefined
      setMultipleFilters(updates as Partial<FilterOptions>)
      if (value !== undefined) scrollToMandates()
    },
    [setMultipleFilters]
  )

  /** The adapter every directory uses to read and write its one dimension. */
  const selection = useMemo<DirectorySelection>(
    () => ({
      active: (key: DirectoryFilterKey) => filters[key],
      select: (key: DirectoryFilterKey, value: string) => {
        const isActive = filters[key] === value
        applySelection(key, isActive ? undefined : value)
        close()
      },
    }),
    [filters, applySelection, close]
  )

  /** Narrow to the cited subset, or widen back to the whole catalogue. */
  const setCited = (cited: boolean) => {
    setMultipleFilters({
      cited: cited ? '1' : undefined,
      page: undefined,
    } as Partial<FilterOptions>)
  }

  /**
   * Switch the version lens. Only `ppb_version` moves: every filter, including
   * `cited`, survives, so "documents DESA cites" stays that question and simply
   * gets answered from the other budget.
   */
  const setVersion = (slug: string) => {
    setMultipleFilters({
      ppb_version: slug,
      page: undefined,
    } as Partial<FilterOptions>)
  }

  const selectBudgetLocation = (level: BudgetTreeLevel, value: string) => {
    const param = BUDGET_LEVEL_PARAM[level]
    const isActive = filters[param] === value
    applySelection(param, isActive ? undefined : value)
    close()
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ExploreButton
        count={organCount}
        noun="organs"
        singular="organ"
        predicate="creating mandates"
        onClick={() => setPanel('organs')}
      />
      <ExploreButton
        count={tableDocumentCount}
        noun="documents"
        singular="document"
        predicate="adopted"
        onClick={() => setPanel('catalogue')}
      />
      <ExploreButton
        count={citedDocumentCount}
        noun="documents"
        singular="document"
        predicate={citedPredicate}
        onClick={() => setPanel('cited')}
      />
      <ExploreButton
        count={entityCount}
        noun="entities"
        singular="entity"
        predicate="implementing mandates"
        onClick={() => setPanel('entities')}
      />

      <DirectoryDialog
        open={panel === 'organs'}
        onClose={close}
        title="Organs creating mandates"
        hint="Click an organ to add it to the filters below."
      >
        <OrgansDirectory groups={organGroups} selection={selection} />
      </DirectoryDialog>

      <DirectoryDialog
        open={panel === 'catalogue'}
        onClose={close}
        title="Documents adopted"
        hint={`The ${tableDocumentCount.toLocaleString()} documents matching the current filters — resolutions, decisions and presidential statements of the General Assembly, Security Council, ECOSOC and Human Rights Council, plus anything else the budget cites. Every count below is under those same filters, so picking a type or topic narrows the table to exactly that number.`}
      >
        <DocumentsDirectory
          domains={subjectDomains}
          documentTypes={documentTypes}
          selection={selection}
        />
      </DirectoryDialog>

      <DirectoryDialog
        open={panel === 'cited'}
        onClose={close}
        title={`Documents ${citedPredicate}`}
        hint="Choose which budget the citation data comes from, narrow the table to the documents it cites, or go to one place in it."
      >
        <div className="space-y-6">
          <section className="space-y-3">
            <PanelHeading>Budget version</PanelHeading>
            <div className="flex flex-wrap gap-2">
              {versions.map((version) => (
                <ScopeButton
                  key={version.slug}
                  label={`PPB ${version.ppb_year}`}
                  detail={version.display_name}
                  selected={activeVersionSlug === version.slug}
                  onClick={() => setVersion(version.slug)}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500">
              The whole document catalogue stays in the table either way. The
              budget you pick here supplies the citation counts, the citing
              entities and the budget locations shown against each document.
            </p>
          </section>

          <section className="space-y-3">
            <PanelHeading>Scope</PanelHeading>
            <div className="flex flex-wrap gap-2">
              <ScopeButton
                label="All documents"
                detail={`${allDocumentsCount.toLocaleString()} documents`}
                selected={!isCitedOnly}
                onClick={() => setCited(false)}
              />
              <ScopeButton
                label="Cited only"
                detail={`${citedDocumentCount.toLocaleString()} documents ${citedPredicate}`}
                selected={isCitedOnly}
                onClick={() => setCited(true)}
              />
            </div>
          </section>

          <section className="space-y-3">
            <PanelHeading>Budget location</PanelHeading>
            {budgetStreams.length > 0 ? (
              <BudgetStreamTree
                hierarchy={budgetStreams}
                active={{
                  stream: filters.budget_document,
                  part: filters.budget_part,
                  section: filters.section,
                  entity: filters.entity,
                  subprogramme: filters.subprogramme,
                }}
                onSelect={selectBudgetLocation}
              />
            ) : (
              <p className="text-sm text-gray-500">
                No budget locations for the current filters.
              </p>
            )}
            <p className="text-xs text-gray-500">
              Counts are documents cited at that point of{' '}
              {activeVersion?.display_name ?? 'the budget'}. Picking one narrows
              the table to those documents.
            </p>
          </section>
        </div>
      </DirectoryDialog>

      <DirectoryDialog
        open={panel === 'entities'}
        onClose={close}
        title="Entities implementing mandates"
        hint="Click an entity to show the mandates it cites in the budget."
      >
        <EntitiesDirectory streams={budgetStreams} selection={selection} />
      </DirectoryDialog>
    </div>
  )
}

/** The #mandates anchor renders outside the explorer's Suspense boundary. */
function scrollToMandates() {
  requestAnimationFrame(() => {
    document
      .getElementById('mandates')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function ExploreButton({
  count,
  noun,
  singular,
  predicate,
  onClick,
}: {
  count: number
  noun: string
  /** Used at count 1, which filtering to a single organ now reaches. */
  singular: string
  predicate: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-5 py-4 text-left transition-all hover:border-un-blue hover:shadow-md focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none"
    >
      <span className="min-w-0 flex-1">
        {/* The sentence, broken so the count and its noun carry the weight and
            the verb phrase sits under them as the quiet half. */}
        <span className="block leading-none">
          <span className="text-3xl font-bold text-gray-900 tabular-nums">
            {count.toLocaleString()}
          </span>{' '}
          <span className="text-base font-semibold text-gray-900">
            {count === 1 ? singular : noun}
          </span>
        </span>
        <span className="mt-1.5 block text-sm text-gray-600">{predicate}</span>
      </span>
      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-un-blue"
      />
    </button>
  )
}

/** h3, not h2: the dialog's own DialogTitle is the h2 of this subtree. */
function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b border-gray-200 pb-1.5 text-sm font-normal tracking-wide text-gray-600 uppercase">
      {children}
    </h3>
  )
}

/**
 * One choice in card 3's panel — a budget version, or one side of the
 * cited/all axis. A card, not a segmented control: every option carries a
 * second line (the budget's full name, or the count it produces).
 */
function ScopeButton({
  label,
  detail,
  selected,
  onClick,
}: {
  label: string
  detail: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex max-w-xs min-w-0 flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-all focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-1 focus-visible:outline-none',
        selected
          ? 'border-un-blue bg-un-blue/5'
          : 'border-gray-200 bg-white hover:border-un-blue'
      )}
    >
      <span
        className={cn(
          'text-sm font-semibold',
          selected ? 'text-un-blue' : 'text-gray-900'
        )}
      >
        {label}
      </span>
      <span className="line-clamp-2 text-xs leading-snug text-gray-500">
        {detail}
      </span>
    </button>
  )
}

function DirectoryDialog({
  open,
  onClose,
  title,
  hint,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        style={CENTER_MODAL_STYLE}
        className={cn(
          'flex max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-3 overflow-hidden p-4',
          'sm:w-[calc(100vw-4rem)] sm:p-6'
        )}
      >
        <DialogHeader className="text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{hint}</DialogDescription>
        </DialogHeader>
        <DirectorySelectContext.Provider value={{ onSelect: onClose }}>
          <div className="-mr-1 min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
            {children}
          </div>
        </DirectorySelectContext.Provider>
      </DialogContent>
    </Dialog>
  )
}
