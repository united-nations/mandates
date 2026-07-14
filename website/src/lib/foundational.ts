/**
 * "Foundational" mandates — the constitutive instruments an entity's mandate
 * derives from, as opposed to the legislative mandates for the budget period.
 *
 * WHAT IT IS
 * ----------
 * Each budget fascicle states, in prose, where an entity's authority comes
 * from ("The mandate derives from…") and then, separately, tabulates every
 * resolution entrusting it with activities. A citation is foundational here iff
 * it was extracted from the former — `part_in_document = 'Mandates and
 * background'` — rather than the Legislative mandates table.
 *
 * The distinction is the budget rules' own. ST/SGB/2018/3 (PPBME Rules),
 * rule 104.3(a):
 *
 *   "Requests and directives to the Secretary-General … constitute legislative
 *    mandates for proposed activities. Legislation establishing an
 *    organizational unit or providing the general mandate for work in an area
 *    should not be cited unless it is the only mandate for the activities
 *    proposed."
 *
 * So UNEP's narrative cites resolution 2997 (XXVII), which created it, while
 * its table lists the 148 resolutions that task it. Same for ECLAC (106 (VI)),
 * ECA (671 A (XXV)) and OLA (Charter Article 102).
 *
 * THE NAME IS PROVISIONAL — AND CONTESTED
 * ---------------------------------------
 * "Foundational mandate" is NOT attested UN terminology, and its one official
 * use means something else: in the UN80 Co-Chairs' script (12 March 2026)
 * "foundational" denotes norm-setting mandates of universal character, while
 * the entity-establishing sense is a separate category, "institution-creating"
 * (the vocabulary adopted in A/RES/80/251, para 25). The PPBME's own phrase for
 * what we mean is "general mandate" (rule 104.3(a) above).
 *
 * The label is being taken to the team. It lives here, alone, so that renaming
 * it is a one-line change — do not inline the string anywhere else.
 */

/** The `part_in_document` value that marks a citation as foundational. */
export const FOUNDATIONAL_PART_IN_DOCUMENT = 'Mandates and background'

export const FOUNDATIONAL_LABEL = 'Foundational'

export const FOUNDATIONAL_TOOLTIP =
  'Foundational: this entity cites the document in its “Mandates and background” narrative — the instruments its mandate derives from — rather than only in its Legislative mandates table.'

/** True if `entity` cites this document as a foundational mandate. */
export function isFoundational(
  entity: string | null | undefined,
  foundationalEntities: string[] | undefined
): boolean {
  if (!entity || !foundationalEntities?.length) return false
  return foundationalEntities.includes(entity)
}
