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

/**
 * The state line's slot: one line of its own type, plus the gap under it. The
 * rendered line and the empty reservation that stands in for it on cards with
 * nothing to say both carry this, so the two cannot drift apart — which is the
 * whole point, since the reservation only works while it is exactly as tall as
 * the thing it is reserving for.
 */
const STATE_LINE_SLOT = 'mb-1 block text-[13px] leading-snug'

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
 *   1. sources         — distinct recorded sources in it, as the panel lists them
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

  const citedCount = citedCountLine(cardStates.cited)

  // The four state lines, resolved once here rather than at each call site,
  // because a card now needs to know something no card knows about itself:
  // whether any OTHER card is showing one. A card with no state line reserves
  // its height when a sibling has one, so the figures stay level instead of
  // the bare cards riding a line higher.
  //
  // Derived from the rendered lines themselves, not from a proxy for them.
  // `scopeCause !== null` is equivalent today — a state line appears exactly
  // when a selection is active — but it is equivalent by a chain of reasoning
  // about the resolver rather than by construction, and a condition that
  // learns to show a state line without a selection behind it would break the
  // proxy silently. Asking the same function the render asks cannot drift.
  const stateLines = {
    organs: cardStateLine(cardStates.organs, cardStates),
    documents: cardStateLine(cardStates.documents, cardStates),
    cited: cardStateLine(cardStates.cited, cardStates),
    entities: cardStateLine(cardStates.entities, cardStates),
  }
  const anyStateLine = Object.values(stateLines).some(
    (line) => line !== undefined
  )

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
        stateLine={stateLines.organs}
        reserveStateLine={anyStateLine}
        count={cardStates.organs.value}
        // The narrowed form takes a different noun from the plural, and the two
        // are not to be normalised. In the full state the unit is followed by
        // the quiet line, which supplies its context; the narrowed state drops
        // that line, so there the unit is the only noun on the card and a bare
        // "of 23 sources" reads as sources of anything. Cut or reword the quiet
        // line and the full-state plural needs revisiting with it.
        countUnit={
          cardStates.organs.condition === 'full'
            ? cardStates.organs.value === 1
              ? 'source'
              : 'sources'
            : `of ${cardStates.organs.baselineValue.toLocaleString()} mandate sources`
        }
        quietLine={
          cardStates.organs.condition === 'full'
            ? 'recorded as issuing the documents shown'
            : undefined
        }
        onClick={() => setPanel('organs')}
      />
      {/* Card 2. Its second line is a predicate or a denominator, never both,
          and whether it can call its population the registry is a separate
          question from whether it is narrowed — four outcomes, resolved
          upstream (ExploreCardStates.documents.frame) and worded in
          documentsQuietLine, below. */}
      <ExploreButton
        stateLine={stateLines.documents}
        reserveStateLine={anyStateLine}
        count={cardStates.documents.value}
        countUnit={cardStates.documents.value === 1 ? 'document' : 'documents'}
        quietLine={documentsQuietLine(cardStates.documents)}
        onClick={() => setPanel('catalogue')}
      />
      {/* Card 3. Its identity is "subset of card 2", so its denominator is
          card 2's LIVE figure — the one deliberate exception to denominators
          being in the card's own unit, and the only expression of the subset
          relation that survives the grid reflowing the two cards onto
          different rows. Which of the three forms that relation takes is
          resolved upstream (ExploreCardStates.cited.countForm); the strings
          for each are in citedCountLine, below. */}
      <ExploreButton
        stateLine={stateLines.cited}
        reserveStateLine={anyStateLine}
        count={citedCount.count}
        countPrefix={citedCount.prefix}
        countUnit={citedCount.unit}
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
        stateLine={stateLines.entities}
        reserveStateLine={anyStateLine}
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
        title="Sources of mandates"
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

/**
 * Card 2's second line, one branch per frame. Which frame is resolved upstream
 * (see DocumentsFrame); only the wording is here.
 *
 * The card names its own population, so it is the one card whose second line
 * can be false under a filter it cannot name. "In the registry" therefore
 * renders only when the baseline really is the registry, and the possessive
 * forms take over when it is not:
 *
 *   registryPredicate        listed in the registry
 *   filtersPredicate         matching your filters
 *   registryDenominator      of the 42,944 in the registry
 *   otherFiltersDenominator  of the 3 matching your other filters
 *
 * "Your other filters", not "your filters", in the last one: the card is
 * scoped, so a card-owned selection is narrowing it further and the baseline
 * is what the REST of the filters match. Dropping "other" would claim the
 * figure below matches all of them, which is the number the card is showing
 * as smaller.
 */
function documentsQuietLine(state: ExploreCardStates['documents']): string {
  switch (state.frame) {
    case 'registryPredicate':
      return 'listed in the registry'
    case 'filtersPredicate':
      return 'matching your filters'
    case 'registryDenominator':
      return `of the ${state.baselineValue.toLocaleString()} in the registry`
    case 'otherFiltersDenominator':
      return `of the ${state.baselineValue.toLocaleString()} matching your other filters`
  }
}

/**
 * Card 3's count line, one branch per form. The three outcomes are named
 * upstream (see CitedCountForm) and only worded here, so a reader changing the
 * wording cannot change which state renders it, and a reader changing the rule
 * has one place to go rather than three ternaries to keep in agreement.
 *
 *   empty      none of them
 *   collapsed  all 433 of them
 *   fraction   1,180 of the 27,942 shown        (scoped)
 *              2,777 of them                    (full)
 *
 * The empty form has no figure. "none" is the count, in words, and a 0 beside
 * it would be the same fact twice.
 */
function citedCountLine(state: ExploreCardStates['cited']): {
  count?: number
  prefix?: string
  unit: string
} {
  switch (state.countForm) {
    case 'empty':
      return { prefix: 'none', unit: 'of them' }
    case 'collapsed':
      return { count: state.value, prefix: 'all', unit: 'of them' }
    case 'fraction':
      return {
        count: state.value,
        // Only the scoped card states the denominator. In the full state the
        // card is the whole cited set and "of them" points at card 2 without
        // repeating its figure.
        unit:
          state.condition === 'scoped'
            ? `of the ${state.shownDocumentsValue.toLocaleString()} shown`
            : 'of them',
      }
  }
}

function ExploreButton({
  stateLine,
  reserveStateLine,
  count,
  countPrefix,
  countUnit,
  quietLine,
  onClick,
}: {
  stateLine?: ExploreCardStateLine
  /**
   * True when ANY card in the row is showing a state line — including this
   * one, which simply ignores it then. A card cannot work this out for itself:
   * it is a fact about its siblings, and it is what lets a card with nothing
   * to say hold the space rather than close up. Required rather than optional
   * so a new card has to answer it.
   */
  reserveStateLine: boolean
  /**
   * Omitted on a card that states no figure here: card 4 selected, whose
   * figure sits inside the quiet line, and card 3 empty, where the prefix is
   * the count in words.
   */
  count?: number
  /** Body-size word(s) rendered before the large figure ("all", "none"). */
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
      // flex-col is load-bearing, not stylistic. A button centres its contents
      // vertically whatever its display is set to, so a card with less content
      // than the tallest in its row sat half the difference low. Which card
      // that was moved with the viewport, since which quiet lines wrap decides
      // which cards are short: at the narrowest four-across it was card 2
      // alone, nine pixels down, and at other widths a different set.
      //
      // Making the button a flex container replaces that with ordinary top
      // alignment. Setting align-items, align-content or display:flow-root
      // does NOT work — measured, all three: the centring belongs to the
      // button itself and no alignment property on it reaches the anonymous
      // box doing it. Swapping the element for a div fixes it too, which is
      // how the cause was pinned down.
      //
      // Top alignment is half of it. The other half is that the state line
      // above the figure has to be the same height on every card, which the
      // reservation below now handles for the case where some cards have one
      // and some do not.
      //
      // What is still NOT handled: a cause long enough to wrap on one card and
      // not another. Card 2 can carry all three selection names plus the
      // hedge, which runs to three lines at the narrowest four-across where
      // its neighbours run to one, and the reservation is one line tall. So
      // the figures sit level whenever every state line occupies one line, and
      // do not when one of them wraps further than the rest.
      className={cn(
        'group @container relative flex flex-col rounded-lg border border-gray-200 bg-white px-4 py-4 text-left transition-all hover:border-un-blue hover:shadow-md focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none',
        // The corner mark renders exactly when the "Scoped to …" line does:
        // the mark alone would say a number is partial without saying partial
        // of what.
        stateLine?.kind === 'scoped' && 'explore-scope-mark'
      )}
    >
      {/* Just below the body scale: the state line repeats across every scoped
          card in the row, names a cause the selected card already carries in
          full, and must not compete with the figure. At body size the
          conjunction form wrapped at the narrowest four-across column. At 12px
          it read as fine print, which is the wrong register for the first
          thing on the card and the only line naming what narrowed the figure
          below it. 13px is a deliberately small lift: enough to stop it
          reading as a footnote, not enough to compete with the figure.

          One size for both forms. The selected form has the accent and the
          weight to distinguish it and needs no size of its own, and giving it
          one would offset the two forms against each other by the difference —
          reintroducing by hand the misalignment the flex column above removes
          by construction. */}
      {stateLine ? (
        <span className={STATE_LINE_SLOT}>
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
      ) : reserveStateLine ? (
        // Empty, and empty on purpose. Cards 1 and 4 have nothing to say in
        // the cited-only state, but the two cards beside them do, and without
        // this they would ride a line higher. `1lh` is one line of whatever
        // type STATE_LINE_SLOT sets, so the reservation is the same height as
        // the line it stands in for by definition rather than by a number
        // somebody measured once and would have to measure again.
        //
        // aria-hidden because there is nothing here to hear. A reader moving
        // across the row should meet a state line on the cards that have one
        // and nothing at all on the cards that do not, which is the truth of
        // it; an empty element announced in the same position would imply the
        // card had a cause it was declining to name.
        <span aria-hidden className={cn(STATE_LINE_SLOT, 'min-h-[1lh]')} />
      ) : null}
      {/* The count line. The figure is the only character that scales with
          the card (hence @container, and cqw rather than a breakpoint);
          everything beside it — prefix, unit, denominator clause — holds body
          size, so nothing competes with the figure for first read.

          The coefficient is fit to the longest line a card can now hold, a
          four-digit figure plus "of the 27,942 shown" (cqw resolves against
          the container's CONTENT box — the card interior, not its border
          box): at 13.5cqw that line just fits one-line at the widest
          four-across interior (a 28px figure + 132px of clause inside
          207px — that width is unverified, no reading has been taken above a
          1024px viewport). In the narrow band just above the lg breakpoint the
          same line no longer fits, and the clause WRAPS under the figure
          rather than shrinking it — which is why the old whitespace-nowrap is
          gone. Keeping it would have meant sizing every card's figure to that
          one clause at a 181.65px interior (measured: the figure computes to
          24.5236px there, and 24.5236 / 0.135 is the container's content box),
          leaving it at ~17px against 14px body text: no hierarchy left.
          Cards already take their natural height, so an occasional second
          line costs nothing fixed heights were buying.

          The chevron is out of the flow (bottom right, beside the quiet line)
          rather than a flex sibling: in the flow it took 32px off the top line
          of every card, and the top line is the one that needed the room. */}
      {/* The figure is optional within the line, not the line's condition:
          card 3's empty form is a count line whose count is the word "none"
          (see citedCountLine). The separating space rides with the figure so
          that form does not render two of them. */}
      {(count !== undefined || countPrefix !== undefined) && (
        <span className="block leading-tight">
          {countPrefix !== undefined && (
            <span className="text-sm font-semibold text-gray-900">
              {countPrefix}
            </span>
          )}
          {count !== undefined && (
            <>
              {countPrefix !== undefined && ' '}
              <span className="text-[clamp(1.25rem,13.5cqw,2.25rem)] leading-none font-bold text-gray-900 tabular-nums">
                {count.toLocaleString()}
              </span>
            </>
          )}
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
      {/* The chevron shares a horizontal band with only the card's FINAL
          content line, so only that line owes it clearance. This used to be
          pr-7 on the whole quiet line, which made every line pay: card 3's
          one-line subtext wrapped purely because of padding reserved for a
          chevron two lines below it. Now an inline-block shim rides the end
          of the text instead — 20px, sized from the chevron's geometry (its
          box overlaps the content box by ~15px and its drawn ink starts ~4px
          inside, so 20px keeps text ~9px clear of the ink). When text plus
          shim cannot fit, the empty shim wraps alone rather than pulling a
          word down with it.

          Cards whose last line is the count line (card 1 selected/scoped)
          carry no shim: their content is two lines against taller siblings
          in the same row, so the bottom-anchored chevron sits well below
          their text. */}
      {quietLine !== undefined && (
        <span className="mt-1.5 block text-sm leading-snug text-gray-600 after:inline-block after:w-5 after:content-['']">
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
