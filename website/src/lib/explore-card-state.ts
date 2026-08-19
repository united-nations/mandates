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
 * Everything in this module is pure so it can be exercised by `pnpm test`
 * without a database.
 */

import type { FilterOptions } from '@/types'

export type ExploreCardCondition = 'full' | 'selected' | 'scoped'

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
  documents: ExploreCardState
  cited: ExploreCardState & {
    /**
     * Card 2's live figure. Card 3 is measured against the documents currently
     * shown, not against its own full population — its identity is "subset of
     * card 2", and that relation must hold in every state, including when the
     * grid reflows the two cards onto different rows.
     */
    shownDocumentsValue: number
    /**
     * True when every document in view is cited — the two figures collapse to
     * one and a fraction would say nothing. Computed here, once, from card 3's
     * value and card 2's live value: a component that receives only its own
     * props cannot re-derive it without the two cards coming to disagree.
     */
    citedMatchesShown: boolean
  }
  entities: ExploreCardState
  /**
   * What the scoped cards are scoped TO: the `frame` of every selected card,
   * joined with " and ", in card order (organs, entities, cited) rather than
   * the order the user picked them — so two routes to the same state produce
   * one string. Null when nothing is selected, in which case no card is
   * scoped.
   */
  scopeCause: string | null
  /**
   * The same cause built from `spokenFrame`s — full names — for the
   * visually-hidden copy of the scoped tag. Null exactly when scopeCause is.
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
  /** Documents with `cited` ignored — card 2 when the cited filter is off. */
  allDocumentsCount: number
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
 * figures, and the active selections.
 */
export function resolveExploreCardStates(
  current: ExploreCardFigures,
  baseline: ExploreCardFigures,
  selections: ExploreCardSelections
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

  // Card order, not selection order.
  const activeSelections = [organSelection, entitySelection, citedSelection]
    .filter((s) => s !== undefined)
  const scopeCause =
    activeSelections.length > 0
      ? activeSelections.map((s) => s.frame).join(' and ')
      : null
  const spokenScopeCause =
    activeSelections.length > 0
      ? activeSelections.map((s) => s.spokenFrame).join(' and ')
      : null

  // Card 2 shows whichever document count the active filters select.
  const shownDocumentsValue = citedOnly
    ? current.citedDocumentCount
    : current.allDocumentsCount

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
      condition: conditionOf(
        false,
        shownDocumentsValue,
        baseline.allDocumentsCount,
        anySelectionActive
      ),
      value: shownDocumentsValue,
      baselineValue: baseline.allDocumentsCount,
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
      citedMatchesShown: current.citedDocumentCount === shownDocumentsValue,
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
