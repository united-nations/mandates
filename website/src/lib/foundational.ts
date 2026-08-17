/**
 * Documents an entity cites in the "Mandates and background" narrative of its
 * budget fascicle, as opposed to only in its "Legislative mandates" table.
 *
 * WHAT IT IS
 * ----------
 * Each budget fascicle states, in prose, where an entity's authority comes
 * from ("The mandate derives from…") and then, separately, tabulates every
 * resolution entrusting it with activities. A citation qualifies here iff it
 * was extracted from the former — `part_in_document = 'Mandates and
 * background'` — rather than the Legislative mandates table.
 *
 * So UNEP's narrative cites resolution 2997 (XXVII), which created it, while
 * its table lists the 148 resolutions that task it. Same for ECLAC (106 (VI)),
 * ECA (671 A (XXV)) and OLA (Charter Article 102).
 *
 * ST/SGB/2018/3 (PPBME Rules), rule 104.3(a), points the same way:
 *
 *   "Requests and directives to the Secretary-General … constitute legislative
 *    mandates for proposed activities. Legislation establishing an
 *    organizational unit or providing the general mandate for work in an area
 *    should not be cited unless it is the only mandate for the activities
 *    proposed."
 *
 * Treat that as intent rather than a live rule: the fascicles do not actually
 * follow it (founding resolutions do appear in the tables), and the rule
 * governs a strategic framework that A/RES/72/266 effectively superseded by
 * merging plan and budget.
 *
 * THE LABEL — settled July 2026
 * -----------------------------
 * We previously called this "Foundational". That was our own coinage, it
 * asserted a hierarchy of importance we cannot defend, and it collided with
 * actual UN usage: in A/RES/80/251, para 25, "foundational" denotes
 * norm-setting mandates of universal character, while the entity-establishing
 * sense is a separate category, "institution-creating".
 *
 * The label is now the General Assembly's own name for the section, so it
 * asserts only WHERE the citation appears and claims nothing about its weight.
 * A/RES/74/251, para 16, names the string verbatim (checked against our
 * digitallibrary mirror):
 *
 *   "Approves, on an exceptional basis and without creating a precedent, …
 *    the programme narrative that is composed solely of the 'Mandates and
 *    background', 'Recent developments', 'Strategy and external factors for
 *    2020' and 'Evaluation activities' sections…"
 *
 * Note also that the split we are labelling is younger than it looks. The
 * Legislative mandates table is absent from A/74/6 and present from A/75/6
 * onward, created by GA instruction — A/RES/74/251, sub-para (i):
 * "Incorporating the list of legislative mandates into the published official
 * document and not into the supplementary document provided informally". It is
 * a 2020 formatting decision, not a legal hierarchy, which is the second reason
 * not to imply one.
 *
 * The identifiers below keep their FOUNDATIONAL_* names deliberately: only the
 * user-facing wording was in question, and renaming them would churn call sites
 * for no benefit. The strings live here alone so the label stays a one-line
 * change — do not inline them anywhere else.
 */

/** The `part_in_document` value that marks a citation as one of these. */
export const FOUNDATIONAL_PART_IN_DOCUMENT = 'Mandates and background'

/** Badge text. Long by design: it quotes the fascicle section name. */
export const FOUNDATIONAL_LABEL = 'Mandates and background'

/**
 * Checkbox label for the filter. Separate from FOUNDATIONAL_LABEL because the
 * filter composed it as "{label} mandates only", which would now read
 * "Mandates and background mandates only".
 */
export const FOUNDATIONAL_FILTER_LABEL = 'Cited in Mandates and background'

/**
 * The other `part_in_document` value, and how it is spelled on screen.
 *
 * The fascicle heading is "Legislative mandates"; every user-facing string says
 * "Legislative mandates list", never "table" — the reader sees a list, and
 * "table" collided with the data table the site itself renders.
 */
export const LEGISLATIVE_PART_IN_DOCUMENT = 'Legislative mandates'
export const LEGISLATIVE_LABEL = 'Legislative mandates list'

/**
 * Display name for a raw `part_in_document` value. Unknown values (the PKM
 * streams carry their own section headings, e.g. "Mandate and planning
 * assumptions") are passed through verbatim rather than guessed at.
 */
export function partInDocumentLabel(value: string): string {
  if (value === LEGISLATIVE_PART_IN_DOCUMENT) return LEGISLATIVE_LABEL
  return value
}

/**
 * Reassurance against misreading the narrative/list split as exclusive.
 * Shared between the badge tooltip and the detail page's chip-row legend.
 */
export const FOUNDATIONAL_BOTH_NOTE = 'Many documents appear in both.'

export const FOUNDATIONAL_TOOLTIP =
  'Cited in this entity’s “Mandates and background” narrative in the programme budget fascicle, not only in its Legislative mandates list. ' +
  FOUNDATIONAL_BOTH_NOTE

/**
 * The legend for the blue dot on the detail page's entity chips — the one
 * surface where the claim is anchored to a dot rather than to a badge, so it
 * needs its own referent and cannot reuse FOUNDATIONAL_TOOLTIP, whose two
 * badge consumers have no dot to point at.
 */
export const FOUNDATIONAL_DOT_LEGEND = `A dot marks an entity that cites this document in its “${FOUNDATIONAL_LABEL}” narrative in the programme budget fascicle, not only in its ${LEGISLATIVE_LABEL}.`

/** True if `entity` cites this document in its Mandates and background narrative. */
export function isFoundational(
  entity: string | null | undefined,
  foundationalEntities: string[] | undefined
): boolean {
  if (!entity || !foundationalEntities?.length) return false
  return foundationalEntities.includes(entity)
}
