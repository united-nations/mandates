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
import type {
  ExploreCardState,
  ExploreCardStates,
} from '@/lib/explore-card-state'
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
  /**
   * The resolved condition of each card (full / selected / scoped), with the
   * live and full-state figures the copy is built from. Resolved on the
   * server, where the baseline figures and the organ/entity name lists live.
   */
  cardStates: ExploreCardStates
  organGroups: OrganGroup[]
  budgetStreams: BudgetStream[]
  subjectDomains: SubjectDomain[]
  documentTypes: DocumentTypeCatalogue
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
 * The four entry points at the top of the mandate explorer. Each states one
 * fact about the CURRENT result set — "42,944 documents listed in the
 * registry" — and doubles as a gateway: clicking it opens the matching
 * directory or filter panel.
 *
 * ONE rule: every card number honours every active filter, its own dimension
 * included. Each states what the table below is showing — filter to one organ
 * and card 1 reads 1. Nothing is pinned to a scope, so every selection is
 * purely ADDITIVE: it keeps the other filters and changes exactly the one
 * dimension it names.
 *
 * The four numbers, all over the current result set:
 *
 *   1. organs & bodies — distinct issuing bodies in it
 *   2. documents       — the table total
 *   3. cited documents — the cited subset of it, measured against card 2
 *   4. entities        — distinct citing entities in it
 *
 * On top of that, each card wears its resolved condition (cardStates): a card
 * holding the active filter names its selection; a card whose figure is
 * smaller than its full-state figure says what narrowed it ("Scoped to …")
 * and swaps its predicate for a denominator. See lib/explore-card-state.ts
 * for how the conditions are resolved.
 *
 * The panels' option LISTS are the one place the own dimension is dropped, and
 * only there: a list that collapsed to the value already chosen could never be
 * used to choose anything else (see DIMENSION_GROUPS). Card 1 can therefore
 * read 1 while its panel still lists all the organs — the card reports, the
 * panel offers. For the same reason the "All documents" option in card 3's
 * chooser states the count it would produce rather than the current one.
 *
 * Every number is read through ONE budget version, chosen in card 3's panel.
 * That choice is a lens, not a filter: the list always covers the whole
 * catalogue unified with what the selected version cites, and the version
 * decides which citations — counts, entities, budget locations — are attached
 * to those documents. Switching it therefore moves every number on the page,
 * and — because the full-state figures are read through the same lens — marks
 * no card as scoped.
 *
 * Styling follows the UN Transparency Portal: a white tile with a grey border,
 * un-blue used only as an accent on hover, shadow on hover only, everything
 * left-aligned. No leading icons — the number is the anchor.
 */
export function DirectoryExplorer({
  cardStates,
  organGroups,
  budgetStreams,
  subjectDomains,
  documentTypes,
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
  const tableDocumentCount = isCitedOnly
    ? citedDocumentCount
    : allDocumentsCount
  const activeVersion = versions.find((v) => v.slug === activeVersionSlug)
  // Panel copy only. On the panel surfaces the budget version is named when it
  // is NOT the current one: naming it always spent the line on the default,
  // which is what every reader already assumes. The CARDS name the cycle year
  // unconditionally — card 3's and card 4's figures are version-scoped, and a
  // card with no qualifier standing beside them would imply the figure is
  // version-invariant.
  const latestVersionYear = versions.reduce(
    (year, v) => Math.max(year, v.ppb_year),
    0
  )
  const citedPredicate =
    activeVersion && activeVersion.ppb_year !== latestVersionYear
      ? `cited as mandates in PPB ${activeVersion.ppb_year}`
      : 'cited as mandates'
  // The cards degrade to versionless copy in the (unobserved) case of an
  // active version that matches no known slug; nothing false is stated, the
  // year is just not named.
  const cycleYear = activeVersion?.ppb_year

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
      {/* Card 1. Its figure is a facet cardinality over PRESENT issuing
          bodies: it asserts that N distinct bodies appear among the documents
          shown, not that every document has one. A small set of documents
          (114 at the time of writing, 0.26% of the corpus) carries no
          recorded issuing body, so the bodies here did not issue every
          document in view — which is why the quiet line reads "recorded as
          issuing the documents shown" and not "issuing": a bare transitive
          verb would quantify over every row. The unattributed set does not
          falsify the count and gets no caveat on the card. */}
      <ExploreButton
        stateLine={cardStateLine(cardStates.organs, cardStates)}
        count={cardStates.organs.value}
        countUnit={
          cardStates.organs.condition === 'full'
            ? cardStates.organs.value === 1
              ? 'organ or body'
              : 'organs & bodies'
            : `of ${cardStates.organs.baselineValue.toLocaleString()} organs & bodies`
        }
        quietLine={
          cardStates.organs.condition === 'full'
            ? 'recorded as issuing the documents shown'
            : undefined
        }
        onClick={() => setPanel('organs')}
      />
      {/* Card 2. When narrowed, the denominator line replaces the predicate:
          the two never render together. */}
      <ExploreButton
        stateLine={cardStateLine(cardStates.documents, cardStates)}
        count={cardStates.documents.value}
        countUnit={cardStates.documents.value === 1 ? 'document' : 'documents'}
        quietLine={
          cardStates.documents.condition === 'scoped'
            ? `of the ${cardStates.documents.baselineValue.toLocaleString()} in the registry`
            : 'listed in the registry'
        }
        onClick={() => setPanel('catalogue')}
      />
      {/* Card 3. Its identity is "subset of card 2", so its denominator is
          card 2's LIVE figure — the one deliberate exception to denominators
          being in the card's own unit, and the only expression of the subset
          relation that survives the grid reflowing the two cards onto
          different rows. When the two figures collapse to one (every document
          in view is cited — the COMMON path under an organ selection, not an
          edge case) the fraction says nothing and the all-form renders
          instead. */}
      <ExploreButton
        stateLine={cardStateLine(cardStates.cited, cardStates)}
        count={cardStates.cited.value}
        countPrefix={cardStates.cited.citedMatchesShown ? 'all' : undefined}
        countUnit={
          cardStates.cited.citedMatchesShown
            ? 'of them'
            : cardStates.cited.condition === 'scoped'
              ? `of the ${cardStates.cited.shownDocumentsValue.toLocaleString()} shown`
              : 'of them'
        }
        quietLine={
          cycleYear !== undefined
            ? `cited in the ${cycleYear} budget cycle`
            : 'cited in the budget cycle'
        }
        onClick={() => setPanel('cited')}
      />
      {/* Card 4. The schema records that an entity CITED a document in its
          budget submission; there is no implementation signal anywhere in the
          system, so the card says what the artefact is. The figure is
          version-scoped, so the cycle year is always named. When an entity is
          selected the figure sits inside the sentence — every entity that
          cites the same documents is in it, which is why the card does not
          read "1". */}
      <ExploreButton
        stateLine={cardStateLine(cardStates.entities, cardStates)}
        count={
          cardStates.entities.condition === 'selected'
            ? undefined
            : cardStates.entities.value
        }
        countUnit={
          cardStates.entities.condition === 'selected'
            ? undefined
            : cardStates.entities.value === 1
              ? 'entity'
              : 'entities'
        }
        quietLine={
          cardStates.entities.condition === 'selected'
            ? `among ${cardStates.entities.value.toLocaleString()} ${
                cardStates.entities.value === 1 ? 'entity' : 'entities'
              } citing these documents`
            : cardStates.entities.condition === 'scoped'
              ? `of ${cardStates.entities.baselineValue.toLocaleString()}`
              : cycleYear !== undefined
                ? `citing them in their ${cycleYear} budget submissions`
                : 'citing them in their budget submissions'
        }
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

      {/* "Citing", not "implementing": the data records citation in budget
          submissions and nothing about implementation, so the heading says
          what the data can support. */}
      <DirectoryDialog
        open={panel === 'entities'}
        onClose={close}
        title="Entities citing mandates"
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

/**
 * The line above the count that names the card's state.
 *
 * - `scoped`: "Scoped to <cause>" — the card shows part of something larger,
 *   and the cause is what narrowed it.
 * - `selected`: "<name> selected" — the card holds the active filter. The name
 *   carries the accent and the word "selected" stays in body colour, so the
 *   two are not read as one phrase; the word is there because colour alone
 *   cannot be the carrier of the selected/scoped distinction (WCAG 1.4.1).
 */
type ExploreCardStateLine =
  | {
      kind: 'scoped'
      /** Visible cause — short codes ("ECOSOC and UNCTAD"). */
      cause: string
      /** Screen-reader cause — full names. Deliberately not the same string. */
      spokenCause: string
    }
  | {
      kind: 'selected'
      name: string
      /** The unabbreviated name, where the visible label is a short code. */
      title?: string
    }

/** The state line a resolved card condition renders, if any. */
function cardStateLine(
  state: ExploreCardState,
  states: ExploreCardStates
): ExploreCardStateLine | undefined {
  if (state.condition === 'selected' && state.selection) {
    return {
      kind: 'selected',
      name: state.selection.name,
      // The title only earns its place when it says more than the label —
      // organ selections abbreviated to their short code carry the long name
      // here; every other surface (the panel, the sentence) keeps the long
      // name visible.
      title:
        state.selection.fullName !== state.selection.name
          ? state.selection.fullName
          : undefined,
    }
  }
  if (
    state.condition === 'scoped' &&
    states.scopeCause !== null &&
    states.spokenScopeCause !== null
  ) {
    return {
      kind: 'scoped',
      cause: states.scopeCause,
      spokenCause: states.spokenScopeCause,
    }
  }
  return undefined
}

function ExploreButton({
  stateLine,
  count,
  countPrefix,
  countUnit,
  quietLine,
  onClick,
}: {
  stateLine?: ExploreCardStateLine
  /** Omitted on a card whose figure sits inside the quiet line instead. */
  count?: number
  /** Body-size word(s) rendered before the large figure ("all"). */
  countPrefix?: string
  /** Body-size remainder of the count line: a unit or a denominator clause. */
  countUnit?: string
  /**
   * The line under the count: a predicate ("listed in the registry") or a
   * denominator ("of the 42,944 in the registry") — one slot, so a card can
   * never carry both.
   */
  quietLine?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group @container relative block rounded-lg border border-gray-200 bg-white px-5 py-4 text-left transition-all hover:border-un-blue hover:shadow-md focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none',
        // The corner mark renders exactly when the "Scoped to …" line does:
        // the mark alone would say a number is partial without saying partial
        // of what.
        stateLine?.kind === 'scoped' && 'explore-scope-mark'
      )}
    >
      {stateLine && (
        <span className="mb-1 block pr-7 text-sm leading-snug">
          {stateLine.kind === 'scoped' ? (
            <>
              {/* The visible tag is hidden from readers and replaced by a
                  span carrying the same words plus a separating colon, so
                  what is heard does not depend on the visual layout. */}
              <span aria-hidden className="text-gray-600">
                Scoped to {stateLine.cause}
              </span>
              {/* Full names here where the visible tag carries short codes:
                  the visible tag repeats across cards and is read once, like
                  a column header; a screen reader hears each card alone, so
                  the abbreviation would only cost meaning. */}
              <span className="sr-only">
                Scoped to {stateLine.spokenCause}:
              </span>
            </>
          ) : (
            <>
              <span
                className="font-semibold text-un-blue"
                title={stateLine.title}
              >
                {stateLine.name}
              </span>{' '}
              <span className="text-gray-600">selected</span>
            </>
          )}
        </span>
      )}
      {/* The count line. The figure is the only character that scales with
          the card (hence @container, and cqw rather than a breakpoint);
          everything beside it — prefix, unit, denominator clause — holds body
          size, so nothing competes with the figure for first read.

          The coefficient is fit to the longest line a card can now hold, a
          four-digit figure plus "of the 27,942 shown" (cqw resolves against
          the container's CONTENT box — the card interior, not its border
          box): at 13.5cqw that line just fits one-line at the widest
          four-across interior (a 28px figure + 132px of clause inside
          207px, with slack for fallback-font metrics). In the narrow band
          just above the lg breakpoint the same line no longer fits, and the
          clause WRAPS under the figure rather than shrinking it — which is
          why the old whitespace-nowrap is gone. Keeping it would have meant
          sizing every card's figure to that one clause at a 171px interior,
          leaving it at ~17px against 14px body text: no hierarchy left.
          Cards already take their natural height, so an occasional second
          line costs nothing fixed heights were buying.

          The chevron is out of the flow (bottom right, beside the quiet line)
          rather than a flex sibling: in the flow it took 32px off the top line
          of every card, and the top line is the one that needed the room. */}
      {count !== undefined && (
        <span className="block leading-tight">
          {countPrefix !== undefined && (
            <>
              <span className="text-sm font-semibold text-gray-900">
                {countPrefix}
              </span>{' '}
            </>
          )}
          <span className="text-[clamp(1.25rem,13.5cqw,2.25rem)] leading-none font-bold text-gray-900 tabular-nums">
            {count.toLocaleString()}
          </span>
          {countUnit !== undefined && (
            <>
              {' '}
              <span className="text-sm font-semibold text-gray-900">
                {countUnit}
              </span>
            </>
          )}
        </span>
      )}
      {/* pr-7 keeps the quiet line clear of the chevron. */}
      {quietLine !== undefined && (
        <span className="mt-1.5 block pr-7 text-sm leading-snug text-gray-600">
          {quietLine}
        </span>
      )}
      <ChevronRight
        aria-hidden
        className="absolute right-4 bottom-4 size-5 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-un-blue"
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
