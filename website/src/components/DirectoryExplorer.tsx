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

/** The two scopes the page can be in; card 3's popover switches between them. */
type Scope = {
  mode: 'active_mandates' | 'all_resolutions'
  /** Only meaningful for `active_mandates`; undefined keeps the current one. */
  ppb_version?: string
}

interface DirectoryExplorerProps {
  organGroups: OrganGroup[]
  budgetStreams: BudgetStream[]
  subjectDomains: SubjectDomain[]
  documentTypes: DocumentTypeCatalogue
  /** Documents in the whole catalogue under the active facet filters. */
  catalogueDocumentCount: number
  /** Documents cited in the selected budget version, same facet filters. */
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
 * Dimension groups. Selecting a value inside a card clears its whole group
 * before setting the new value.
 *
 * INVARIANT, and the only thing keeping these tiles honest: each group here must
 * be exactly the set of params the query behind that card drops before counting
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

/** The whole catalogue; card 2's panel pins its selections to this scope. */
const CATALOGUE_SCOPE: Scope = { mode: 'all_resolutions' }

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
 * The four numbers, and what each panel does:
 *
 *   1. organs creating mandates       — getOrganHierarchy, active scope, drops `organ`
 *   2. documents adopted              — getFilteredDocumentCount(all_resolutions)
 *   3. documents cited as mandates    — getFilteredDocumentCount(active_mandates@version)
 *   4. entities implementing mandates — getBudgetHierarchy, cited scope, drops `entity`
 *
 * Cards 2 and 3 are the two arms of one dimension (the scope), so each pins that
 * dimension to its own value and honours every other active filter — the same
 * own-dimension exclusion cards 1 and 4 apply to `organ` and `entity`. Which is
 * why card 3's panel is where the scope is chosen: clicking one of its three
 * scope buttons makes the table return exactly the number on the tile.
 *
 * Every selection made inside a panel is ADDITIVE (it keeps the other active
 * filters) and forces the scope its panel's numbers were computed under, so a
 * node's count always predicts the number of rows the table then shows.
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
  catalogueDocumentCount,
  citedDocumentCount,
  versions,
  activeVersionSlug,
}: DirectoryExplorerProps) {
  const { filters, setMultipleFilters } = useFilters()
  const [panel, setPanel] = useState<Panel | null>(null)
  const close = useCallback(() => setPanel(null), [])

  const organCount = useMemo(
    () => organGroups.reduce((n, g) => n + g.organs.length, 0),
    [organGroups]
  )
  const entityCount = useMemo(
    () => countEntities(budgetStreams),
    [budgetStreams]
  )

  const currentMode = filters.mode ?? 'all_resolutions'
  const activeVersion = versions.find((v) => v.slug === activeVersionSlug)
  const citedPredicate = activeVersion
    ? `cited as mandates in PPB ${activeVersion.ppb_year}`
    : 'cited as mandates in the budget'

  // The scope each panel's numbers were computed under (see the doc comment):
  // the organ directory follows whatever scope is active; the catalogue panel is
  // pinned to all documents; the cited and entity panels to the budget version.
  const citedScope = useMemo<Scope>(
    () => ({ mode: 'active_mandates', ppb_version: activeVersionSlug }),
    [activeVersionSlug]
  )

  /** Write filters the way the panel's counts assume: additively, in scope. */
  const applySelection = useCallback(
    (param: FilterParamKey, value: string | undefined, scope?: Scope) => {
      const updates: Record<string, string | undefined> = {}
      // Clear the param's own dimension group — every count in the panel was
      // computed with that whole group ignored.
      for (const group of DIMENSION_GROUPS) {
        if (group.includes(param))
          for (const key of group) updates[key] = undefined
      }
      updates[param] = value
      updates.page = undefined
      if (scope) {
        updates.mode = scope.mode
        // Deliberately not cleared for all_resolutions: the version choice is
        // remembered so switching back to a budget scope returns to it.
        if (scope.ppb_version) updates.ppb_version = scope.ppb_version
      }
      setMultipleFilters(updates as Partial<FilterOptions>)
      if (value !== undefined) scrollToMandates()
    },
    [setMultipleFilters]
  )

  /** Build the adapter a directory uses to read and write one dimension. */
  const selectionFor = useCallback(
    (scope?: Scope): DirectorySelection => ({
      active: (key: DirectoryFilterKey) => filters[key],
      select: (key: DirectoryFilterKey, value: string) => {
        const isActive = filters[key] === value
        applySelection(key, isActive ? undefined : value, scope)
        close()
      },
    }),
    [filters, applySelection, close]
  )

  const organSelection = useMemo(
    // No scope forced: organs exist in both scopes and getOrganHierarchy counts
    // them under whichever one is active.
    () => selectionFor(undefined),
    [selectionFor]
  )
  const catalogueSelection = useMemo(
    () => selectionFor(CATALOGUE_SCOPE),
    [selectionFor]
  )
  const budgetSelection = useMemo(
    () => selectionFor(citedScope),
    [selectionFor, citedScope]
  )

  const setScope = (scope: Scope) => {
    const updates: Record<string, string | undefined> = {
      mode: scope.mode,
      page: undefined,
    }
    if (scope.ppb_version) updates.ppb_version = scope.ppb_version
    setMultipleFilters(updates as Partial<FilterOptions>)
  }

  const selectBudgetLocation = (level: BudgetTreeLevel, value: string) => {
    const param = BUDGET_LEVEL_PARAM[level]
    const isActive = filters[param] === value
    applySelection(param, isActive ? undefined : value, citedScope)
    close()
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ExploreButton
        count={organCount}
        noun="organs"
        predicate="creating mandates"
        onClick={() => setPanel('organs')}
      />
      <ExploreButton
        count={catalogueDocumentCount}
        noun="documents"
        predicate="adopted"
        active={currentMode === 'all_resolutions'}
        onClick={() => setPanel('catalogue')}
      />
      <ExploreButton
        count={citedDocumentCount}
        noun="documents"
        predicate={citedPredicate}
        active={currentMode === 'active_mandates'}
        onClick={() => setPanel('cited')}
      />
      <ExploreButton
        count={entityCount}
        noun="entities"
        predicate="implementing mandates"
        onClick={() => setPanel('entities')}
      />

      <DirectoryDialog
        open={panel === 'organs'}
        onClose={close}
        title="Organs creating mandates"
        hint="Click an organ to add it to the filters below."
      >
        <OrgansDirectory groups={organGroups} selection={organSelection} />
      </DirectoryDialog>

      <DirectoryDialog
        open={panel === 'catalogue'}
        onClose={close}
        title="Documents adopted"
        hint={`The ${catalogueDocumentCount.toLocaleString()} documents matching the current filters, across the whole catalogue — resolutions, decisions and presidential statements of the General Assembly, Security Council, ECOSOC and Human Rights Council, plus anything else the budget cites. Counts below are for that whole catalogue, so picking a type or topic also switches the table to it.`}
      >
        <DocumentsDirectory
          domains={subjectDomains}
          documentTypes={documentTypes}
          selection={catalogueSelection}
        />
      </DirectoryDialog>

      <DirectoryDialog
        open={panel === 'cited'}
        onClose={close}
        title={`Documents ${citedPredicate}`}
        hint="Choose which documents the table covers, and narrow to one place in the budget."
      >
        <div className="space-y-6">
          <section className="space-y-3">
            <PanelHeading>Scope</PanelHeading>
            <div className="flex flex-wrap gap-2">
              <ScopeButton
                label="All documents"
                detail={`${catalogueDocumentCount.toLocaleString()} documents`}
                selected={currentMode === 'all_resolutions'}
                onClick={() => setScope(CATALOGUE_SCOPE)}
              />
              {versions.map((version) => (
                <ScopeButton
                  key={version.slug}
                  label={`PPB ${version.ppb_year}`}
                  detail={version.display_name}
                  selected={
                    currentMode === 'active_mandates' &&
                    activeVersionSlug === version.slug
                  }
                  onClick={() =>
                    setScope({
                      mode: 'active_mandates',
                      ppb_version: version.slug,
                    })
                  }
                />
              ))}
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
              {activeVersion?.display_name ?? 'the budget'}. Picking one
              switches the table to that budget.
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
        <EntitiesDirectory
          streams={budgetStreams}
          selection={budgetSelection}
        />
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
  predicate,
  active = false,
  onClick,
}: {
  count: number
  noun: string
  predicate: string
  /** The card describes the scope the table is currently in. */
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-lg border bg-white px-5 py-4 text-left transition-all hover:border-un-blue hover:shadow-md focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none',
        active ? 'border-un-blue' : 'border-gray-200'
      )}
    >
      <span className="min-w-0 flex-1">
        {/* The sentence, broken so the count and its noun carry the weight and
            the verb phrase sits under them as the quiet half. */}
        <span className="block leading-none">
          <span className="text-3xl font-bold text-gray-900 tabular-nums">
            {count.toLocaleString()}
          </span>{' '}
          <span className="text-base font-semibold text-gray-900">{noun}</span>
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
 * One of the three scope choices. A card, not a segmented control: the options
 * carry a second line (which budget), and this replaced a toggle whose PPB
 * dropdown was hidden inside one of its two segments.
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

function countEntities(streams: BudgetStream[]): number {
  const seen = new Set<string>()
  for (const stream of streams) {
    if (stream.type === 'ppb') {
      for (const part of stream.parts)
        for (const section of part.sections)
          for (const e of section.entities) seen.add(e.entity)
    } else if (stream.type === 'pko') {
      for (const group of stream.groups)
        for (const e of group.entities) seen.add(e.entity)
    }
  }
  return seen.size
}
