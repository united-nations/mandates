/**
 * State model for the four explore cards on /secretariat.
 *
 * A card is in one of three conditions:
 *
 *   - full:     nothing narrows this card; it shows its whole population.
 *   - selected: this card holds the active filter.
 *   - scoped:   this card shows less than its full-state number because of a
 *               filter held elsewhere.
 *
 * The scoped condition is resolved by COMPARISON, not by a filter-is-active
 * flag: a card is scoped if and only if its figure differs from its full-state
 * figure. Whether a selection narrows a given card is a fact about the data,
 * not about the filter's kind — two selections of the same kind can narrow
 * different cards — so the comparison is the definition, and the marked set
 * cannot be precomputed or cached per filter type.
 *
 * The full-state figures come from a second resolution of the same counts with
 * the card-owned selections dropped and everything else KEPT — the version
 * lens above all. Keeping the lens is what makes a version switch mark
 * nothing: it moves both operands together, so every card compares equal with
 * no version logic anywhere in this module. If a version guard ever seems
 * necessary here, the baseline is being computed without the lens; fix that
 * instead.
 *
 * A third figure sits beside those two: the registry total under the same lens
 * (`registryCountForVersion`). It answers a question the comparison above
 * cannot, because the baseline keeps every filter no card can name and so is
 * not the registry whenever one is active. Only card 2 asks it — see
 * DocumentsFrame.
 *
 * Everything in this module is pure so it can be exercised by `pnpm test`
 * without a database.
 */

import type { FilterOptions } from '@/types'

export type ExploreCardCondition = 'full' | 'selected' | 'scoped'

/**
 * Which of the three forms card 3's count line takes. All three are decided
 * here, once, from card 3's value and card 2's LIVE value: a component that
 * receives only its own props cannot re-derive the relation without the two
 * cards coming to disagree, and a component handed two booleans would be
 * reconstructing a distinction that was already made.
 *
 *   - `empty`     — nothing is shown at all, so there is no fraction to state.
 *   - `collapsed` — every document in view is cited: the two figures are the
 *                   same non-zero number and the fraction says nothing, so the
 *                   card says "all" of them instead. This is the COMMON path
 *                   under an organ selection, not an edge case — only the
 *                   catalogue symbol families contain uncited documents, so
 *                   every other body's documents are in the registry BECAUSE
 *                   they were cited, and shown equals cited for most of them.
 *   - `fraction`  — card 3 is a proper subset of card 2, and the two figures
 *                   are worth stating against each other.
 *
 * Empty is a form of its own rather than a small collapse. The collapse
 * justification is that a fraction of a number by itself says nothing; at zero
 * the fraction says the most useful thing the card can say, and the totality
 * claim that replaces it ("all 0 of them") is vacuously true and reads as a
 * defect. The two cases part company on the reasoning, not on magnitude.
 *
 * ONE is inside `collapsed` deliberately. "all 1 of them" is awkward English
 * and true, and a threshold at two would have nothing behind it — do not add
 * one.
 */
export type CitedCountForm = 'empty' | 'collapsed' | 'fraction'

/**
 * Which of the four forms card 2's second line takes.
 *
 * Two independent facts decide it, which is why there are four and not two:
 * the card's CONDITION — is this figure narrower than its baseline, the
 * question that also governs the mark and the "Scoped to" line — and whether
 * that baseline IS the registry. Neither implies the other.
 *
 *   registryPredicate        listed in the registry
 *   filtersPredicate         matching your filters
 *   registryDenominator      of the 42,944 in the registry
 *   otherFiltersDenominator  of the 3 matching your other filters
 *
 * Collapsing the two facts into one is what let the card say "listed in the
 * registry" over a subject-filtered figure of 3,495 against a registry of
 * roughly 43,000: the baseline is narrowed by the same filter as the value, so
 * the two compare equal and the card reads as full while standing over a
 * fraction of the corpus.
 *
 * Card 2 is the only card that needs this, and the reason is structural rather
 * than an accident of its copy. Every other card's second line is anaphoric —
 * "of them", "the documents shown", "citing them" — and points at whatever
 * population is on screen, so it stays true under any filter without knowing
 * what the filters are. Card 2 is the card that ESTABLISHES that population,
 * so it has nothing to point at and has to name its own scope. Do not
 * generalise this to the others.
 *
 * "Other" in `otherFiltersDenominator` is load-bearing and cannot be dropped.
 * It can only render in a state where it is true: the card is scoped, so a
 * card-owned selection is active for the remaining filters to be other than.
 */
export type DocumentsFrame =
  | 'registryPredicate'
  | 'filtersPredicate'
  | 'registryDenominator'
  | 'otherFiltersDenominator'

/**
 * The two display forms of a selection, plus the unabbreviated original.
 *
 * `name` is how the selection labels itself on its own card ("Cited only");
 * `frame` is how it reads as the object of the visible "Scoped to …" tag; and
 * `spokenFrame` is the same slot for the screen-reader copy of that tag.
 *
 * The visible frame carries the SHORT code ("Scoped to ECOSOC"), not the long
 * name: the tag repeats identically across every scoped card, and a label
 * read three times is read like a column header — brevity wins there. The
 * full name is always present on the selected card itself, so the code is
 * recoverable without leaving the row. The spoken frame keeps the full name:
 * a screen reader hears the cards one at a time, so the repetition argument
 * does not apply, and the abbreviation would cost meaning. The divergence is
 * deliberate; do not collapse the two.
 *
 * All fields are required rather than defaulting through `name`: the default
 * is right for proper nouns and silently wrong for everything else ("Scoped
 * to Cited only" is not English), so a future selection kind must decide its
 * frames explicitly.
 */
export interface ExploreCardSelection {
  name: string
  frame: string
  spokenFrame: string
  /** The unabbreviated form, for title attributes and other full-name surfaces. */
  fullName: string
}

export interface ExploreCardState {
  condition: ExploreCardCondition
  /** The card's own figure under the live filters. */
  value: number
  /** The card's full-state figure, resolved through the same version lens. */
  baselineValue: number
  /** Present exactly when this card holds the active filter. */
  selection?: ExploreCardSelection
}

export interface ExploreCardStates {
  organs: ExploreCardState
  documents: ExploreCardState & {
    /** Which of the four forms card 2's second line takes. */
    frame: DocumentsFrame
  }
  cited: ExploreCardState & {
    /**
     * Card 2's live figure. Card 3 is measured against the documents currently
     * shown, not against its own full population — its identity is "subset of
     * card 2", and that relation must hold in every state, including when the
     * grid reflows the two cards onto different rows.
     */
    shownDocumentsValue: number
    /** Which of the three forms card 3's count line takes. */
    countForm: CitedCountForm
  }
  entities: ExploreCardState
  /**
   * What the scoped cards are scoped TO: the `frame` of every selected card,
   * joined with " and ", in card order (organs, entities, cited) rather than
   * the order the user picked them — so two routes to the same state produce
   * one string. Null when nothing is selected, in which case no card is
   * scoped.
   *
   * Carries a trailing "+ other filters" when something the cards cannot name
   * is also narrowing the row, because otherwise a line that names two filters
   * implies those are the two there are. It is a claim of incompleteness, not
   * a count — see the hedge in the resolver for why no count is available to
   * be more specific with.
   */
  scopeCause: string | null
  /**
   * The same cause built from `spokenFrame`s — full names — for the
   * visually-hidden copy of the scoped tag. Null exactly when scopeCause is,
   * and hedged exactly when it is: the spoken tag makes the same claim to the
   * same standard, so it cannot be the one that sounds exhaustive.
   */
  spokenScopeCause: string | null
}

/** The four figures the cards are built from, in either scope. */
export interface ExploreCardFigures {
  /**
   * Card 1: distinct sources of mandate in the result set. Narrower than every
   * value the documents record — a handful name a body the vocabulary has no
   * entry for, and those are counted here by nothing, because nothing on the
   * page can be clicked to reach them.
   */
  organCount: number
  /** Distinct citing entities in the result set — card 4. */
  entityCount: number
  /**
   * Documents with `cited` ignored — card 2 when the cited filter is off.
   *
   * NOT a count of all documents in either scope, which is why it is not
   * called one. In the live scope it is the documents matching every active
   * filter; in the baseline scope it is the documents matching every filter
   * the cards cannot name. Only when neither is present does it reach the
   * whole registry, and a name that claimed otherwise would assert the one
   * property this figure does not have.
   */
  documentsCount: number
  /** Documents with `cited` on — card 3 always, card 2 when the filter is on. */
  citedDocumentCount: number
}

/**
 * The active selections the cards can own and therefore name. `cited only` is
 * attributed to card 3 (the cited set is card 3's population; cards 2 and 3
 * open the same panel, so the resolver cannot know which card the click came
 * from and the attribution has to be decided here).
 */
export interface ExploreCardSelections {
  organ?: { code: string; longName: string | null }
  entity?: { code: string; longName: string | null }
  citedOnly: boolean
}

/**
 * Above this many characters an organ's long name falls back to its short
 * code — on the selected card's label ONLY. Panels, title attributes and every
 * other full-name surface keep the long name. The threshold tests the string,
 * never the available space, so the same selection renders one way at every
 * viewport width.
 */
export const ORGAN_LABEL_MAX_LENGTH = 35

/**
 * The label an organ selection wears on the card. Some vocabulary rows carry a
 * code and no long name (`long` is null in the table even though callers often
 * type it as string), so the code is the fallback on both paths.
 */
export function organSelectionLabel(
  code: string,
  longName: string | null
): string {
  return longName && longName.length <= ORGAN_LABEL_MAX_LENGTH ? longName : code
}

/**
 * The filter set the full-state figures are resolved under: the three
 * selections the cards can name — organ, entity, cited — dropped, and
 * EVERYTHING else kept.
 *
 * The version lens is kept because it is a lens, not a dimension any card
 * owns: switching it re-measures the whole population rather than hiding part
 * of it, so it must move the baseline and the live figures together.
 *
 * Every other filter (keyword, subject, document type, budget location, year
 * range, …) is also kept, for a different reason: the scoped treatment names
 * its cause ("Scoped to …"), and only the three card-owned selections have a
 * name the cards can render. A baseline that dropped a keyword filter would
 * mark cards as scoped with nothing to attribute the scoping to. Filters
 * outside the card model therefore narrow the figures on both sides equally
 * and the cards stay in their full condition, exactly as they behaved before
 * the state model existed.
 */
export function exploreCardBaselineFilters(
  filters: FilterOptions
): FilterOptions {
  return {
    ...filters,
    organ: undefined,
    entity: undefined,
    cited: undefined,
  }
}

function conditionOf(
  holdsSelection: boolean,
  value: number,
  baselineValue: number,
  anySelectionActive: boolean
): ExploreCardCondition {
  if (holdsSelection) return 'selected'
  // With nothing selected the live scope IS the baseline scope, so the two
  // figures are reads of the same number and comparing them can only pick up
  // noise (e.g. the two cache entries straddling a data refresh), never
  // signal. The comparison only has work to do once a selection exists.
  if (!anySelectionActive) return 'full'
  return value !== baselineValue ? 'scoped' : 'full'
}

/**
 * Resolve the state of all four cards from the live figures, the full-state
 * figures, the active selections, and the registry total.
 *
 * `registryCountForVersion` is the document count with every filter dropped
 * except the version lens — see getExploreCardRegistryCount. It is required,
 * not optional: card 2's frame is a claim about what its number is, and a
 * resolver that could reach a default here would answer that claim without
 * having been told.
 */
export function resolveExploreCardStates(
  current: ExploreCardFigures,
  baseline: ExploreCardFigures,
  selections: ExploreCardSelections,
  registryCountForVersion: number
): ExploreCardStates {
  const { organ, entity, citedOnly } = selections
  const anySelectionActive = Boolean(organ || entity || citedOnly)

  const organSelection: ExploreCardSelection | undefined = organ && {
    name: organSelectionLabel(organ.code, organ.longName),
    // The selection value IS the vocabulary's short code; rows with no long
    // name simply have nothing longer to say.
    frame: organ.code,
    spokenFrame: organ.longName ?? organ.code,
    fullName: organ.longName ?? organ.code,
  }
  const entitySelection: ExploreCardSelection | undefined = entity && {
    name: entity.code,
    frame: entity.code,
    spokenFrame: entity.longName ?? entity.code,
    fullName: entity.longName ?? entity.code,
  }
  const citedSelection: ExploreCardSelection | undefined = citedOnly
    ? {
        name: 'Cited only',
        frame: 'the cited set',
        spokenFrame: 'the cited set',
        fullName: 'Cited only',
      }
    : undefined

  // Whether card 2's baseline is the registry. Two things read it: card 2's
  // own frame, and the hedge on the cause line below. It is hoisted here
  // because a filter that narrows the document baseline narrows every card's
  // baseline — a conjunctive filter can only remove documents — so this one
  // test answers "is something narrowing this row that no card can name" for
  // the whole row, not just for card 2.
  const baselineIsRegistry = baseline.documentsCount === registryCountForVersion

  // The cause line names the selections the cards can name, and there is no
  // count of the rest to fall back on: nothing in this codebase counts active
  // filters, and the two things that come closest disagree with each other
  // about whether a keyword and a sort are filters. The hedge says there are
  // others without saying how many, which is all this predicate supports and
  // all the line needs to stop implying it has listed them.
  //
  // A filter that is switched on but narrows nothing leaves the baseline equal
  // to the registry and takes no hedge. That is right rather than a gap: the
  // claim being hedged is about the number being narrowed.
  const scopeHedge = baselineIsRegistry ? '' : ' + other filters'

  // Card order, not selection order.
  const activeSelections = [organSelection, entitySelection, citedSelection]
    .filter((s) => s !== undefined)
  const scopeCause =
    activeSelections.length > 0
      ? activeSelections.map((s) => s.frame).join(' and ') + scopeHedge
      : null
  const spokenScopeCause =
    activeSelections.length > 0
      ? activeSelections.map((s) => s.spokenFrame).join(' and ') + scopeHedge
      : null

  // Card 2 shows whichever document count the active filters select.
  const shownDocumentsValue = citedOnly
    ? current.citedDocumentCount
    : current.documentsCount

  // Emptiness is tested first, and against card 2's figure rather than card
  // 3's, because "the shown count is zero" is the condition. The two are equal
  // whenever it holds — card 3 is a subset of card 2 — so an equality test
  // placed first would swallow the empty case as a collapse, which is the
  // defect this ordering exists to prevent.
  const citedCountForm: CitedCountForm =
    shownDocumentsValue === 0
      ? 'empty'
      : current.citedDocumentCount === shownDocumentsValue
        ? 'collapsed'
        : 'fraction'

  // Card 2's two facts, resolved separately because they are separate
  // questions. The condition asks whether the figure is narrower than its
  // baseline; the predicate asks whether that baseline is the registry. A
  // filter no card can name narrows both operands of the first and so answers
  // it "no", while answering the second "no" as well — which is the pair of
  // answers the old single test could not represent.
  const documentsCondition = conditionOf(
    false,
    shownDocumentsValue,
    baseline.documentsCount,
    anySelectionActive
  )
  // Card 2 never holds a selection (see the `false` above), so the condition
  // here is 'scoped' or 'full' and nothing else.
  const documentsFrame: DocumentsFrame =
    documentsCondition === 'scoped'
      ? baselineIsRegistry
        ? 'registryDenominator'
        : 'otherFiltersDenominator'
      : baselineIsRegistry
        ? 'registryPredicate'
        : 'filtersPredicate'

  return {
    organs: {
      condition: conditionOf(
        Boolean(organ),
        current.organCount,
        baseline.organCount,
        anySelectionActive
      ),
      value: current.organCount,
      baselineValue: baseline.organCount,
      selection: organSelection,
    },
    documents: {
      condition: documentsCondition,
      value: shownDocumentsValue,
      baselineValue: baseline.documentsCount,
      frame: documentsFrame,
    },
    cited: {
      condition: conditionOf(
        citedOnly,
        current.citedDocumentCount,
        baseline.citedDocumentCount,
        anySelectionActive
      ),
      value: current.citedDocumentCount,
      baselineValue: baseline.citedDocumentCount,
      selection: citedSelection,
      shownDocumentsValue,
      countForm: citedCountForm,
    },
    entities: {
      condition: conditionOf(
        Boolean(entity),
        current.entityCount,
        baseline.entityCount,
        anySelectionActive
      ),
      value: current.entityCount,
      baselineValue: baseline.entityCount,
      selection: entitySelection,
    },
    scopeCause,
    spokenScopeCause,
  }
}
