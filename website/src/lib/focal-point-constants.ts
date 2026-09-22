/**
 * Focal point directory: the record shapes and the coverage vocabulary.
 *
 * A leaf module with no imports, for the same reason `filter-constants.ts` is
 * one. The table and the panel are Client Components and need the coverage
 * kinds at runtime — to group claims and to label the groups. Taking them from
 * `lib/data/focal-points.ts` would put that module in the client graph, and it
 * imports the database helpers, so `pg` would be dragged towards the browser
 * bundle by a four-element string array. Types alone would have been safe, since
 * they are erased; `COVERAGE_KINDS` is a value and is not.
 *
 * The database is the authority for everything here. The kinds match the CHECK
 * on `designation_coverage_claims.coverage_kind`, and the field-level notes on
 * the interfaces below restate what the column comments say.
 */

/**
 * The four kinds a coverage claim can have, in the order the panel reads them:
 * the controlled list first, then the identifiers an entity may know, then the
 * free-text terms.
 *
 * Also the validation set — `designation_coverage_claims_coverage_kind_check`
 * allows exactly these four, so a fifth value reaching the application means the
 * schema moved and this page has not been told what the new kind is called.
 */
export const COVERAGE_KINDS = [
  'body',
  'agenda_item',
  'document_symbol',
  'keyword',
] as const

export type CoverageKind = (typeof COVERAGE_KINDS)[number]

/**
 * What to call each kind. Both numbers, because both are needed: the table cell
 * counts claims ("1 document symbol", "3 bodies") and the panel heads a group
 * with the plural. One source for the words, so the two cannot drift.
 */
export const COVERAGE_KIND_NOUNS: Record<
  CoverageKind,
  { one: string; other: string }
> = {
  body: { one: 'body', other: 'bodies' },
  agenda_item: { one: 'agenda item', other: 'agenda items' },
  document_symbol: { one: 'document symbol', other: 'document symbols' },
  keyword: { one: 'keyword', other: 'keywords' },
}

/** "3 bodies", "1 document symbol". */
export function coverageKindCount(kind: CoverageKind, count: number): string {
  const noun = COVERAGE_KIND_NOUNS[kind]
  return `${count} ${count === 1 ? noun.one : noun.other}`
}

/** The plural, capitalised, as a group heading: "Document symbols". */
export function coverageKindHeading(kind: CoverageKind): string {
  const plural = COVERAGE_KIND_NOUNS[kind].other
  return plural.charAt(0).toUpperCase() + plural.slice(1)
}

/**
 * The ten classes the focal points application assigns to an entity, in the
 * order it groups them. `candidate_entities_entity_class_check` in that
 * application's schema allows exactly these, so nothing else can reach this
 * page; the list is here for the labels, not as a validation set.
 *
 * `related_organization` is the newest of the ten and was split out of
 * `specialized_agency`, which had been holding both constitutional kinds under
 * one word. This list must learn a new value BEFORE the upstream migration
 * that starts storing it: `entityClassLabel` below falls back to the stored
 * string, so a value this file has not met renders as `related_organization`
 * in a public table rather than as a label.
 */
export const ENTITY_CLASSES = [
  'secretariat',
  'regional_commission',
  'fund_programme_institute',
  'specialized_agency',
  'related_organization',
  'special_adviser_or_envoy',
  'political_mission',
  'peacekeeping_operation',
  'intergovernmental_or_expert_body',
  'mechanism_or_tribunal',
] as const

export type EntityClass = (typeof ENTITY_CLASSES)[number]

/**
 * What each class is called on screen; the stored value is the key.
 *
 * `fund_programme_institute` reads "Funds and programmes". The label used to
 * name institutes too, after the stored value's third word, and no entity in
 * the directory is one - every institute in the class is excluded upstream, so
 * the word described no row anybody sees here. The stored value is unchanged;
 * this is the one key whose label deliberately does not track it.
 */
export const ENTITY_CLASS_LABELS: Record<EntityClass, string> = {
  secretariat: 'Secretariat department or office',
  regional_commission: 'Regional commission',
  fund_programme_institute: 'Funds and programmes',
  specialized_agency: 'Specialized agency',
  related_organization: 'Related organization',
  special_adviser_or_envoy: 'Special adviser or envoy',
  political_mission: 'Political mission',
  peacekeeping_operation: 'Peacekeeping operation',
  intergovernmental_or_expert_body: 'Intergovernmental or expert body',
  mechanism_or_tribunal: 'Mechanism or tribunal',
}

/** Plural labels for directory group headings. */
export const ENTITY_CLASS_GROUP_LABELS: Record<EntityClass, string> = {
  secretariat: 'Secretariat Departments and Offices',
  regional_commission: 'Regional Commissions',
  fund_programme_institute: 'Funds and Programmes',
  specialized_agency: 'Specialized Agencies',
  related_organization: 'Related Organizations',
  special_adviser_or_envoy: 'Special Advisers and Envoys',
  political_mission: 'Political Missions',
  peacekeeping_operation: 'Peacekeeping Operations',
  intergovernmental_or_expert_body: 'Intergovernmental and Expert Bodies',
  mechanism_or_tribunal: 'Mechanisms and Tribunals',
}

export function entityClassGroupLabel(value: string): string {
  return (ENTITY_CLASS_GROUP_LABELS as Record<string, string | undefined>)[value] ?? value
}

/**
 * The label for a stored class, or the stored value itself where this list
 * has no label for it. The CHECK on the column makes a value outside the nine
 * unstorable, so the second branch is not a guard against a bad row: it is
 * what a class added upstream before this list learns its label looks like,
 * and the true value unlabelled is a better cell than a thrown page.
 */
export function entityClassLabel(value: string): string {
  return (
    (ENTITY_CLASS_LABELS as Record<string, string | undefined>)[value] ?? value
  )
}

export interface DirectorySummaryContact {
  name: string
  /** Required of a primary contact by CHECK; NULL on an alternate means it was not given. */
  title: string | null
  email: string
  /** `person_telephone`, as the respondent typed it. NULL means none was given. */
  telephone: string | null
  /** `person_telephone_extension`. NULL unless `telephone` is set, by CHECK. */
  telephoneExtension: string | null
  role: 'primary' | 'alternate'
  /** Language codes as given on the form (EN, FR, ES). NULL means unanswered. */
  workingLanguages: string[] | null
}

/**
 * A number and its extension as one string — "+1 917 367 5000 ext. 4521" — or
 * the number alone, or null where there is no number.
 *
 * ONE CELL AND ONE STRING, which is a decision about the table as much as
 * about the format. A separate Extension column would cost a floor set by its
 * own header for content that is three or four digits and absent on most rows,
 * in a table whose seven-column state has no spare width at all; and it would
 * present as two independent facts what a caller does as one action, in
 * sequence. The panel shows the same string for the same reason.
 *
 * NEITHER VALUE IS TOUCHED. Both are printed exactly as they are stored, which
 * is exactly as they were typed. The only thing this adds is the word between
 * them, which is a label this page writes rather than part of either column —
 * so a respondent who wrote the word themselves will see it twice, and that is
 * their text shown as given rather than silently edited away.
 *
 * Null in, null out: absence is carried to the caller, which renders it the
 * way it renders every other absence. An extension with no number cannot be
 * stored — `chk_designation_contacts_extension_needs_telephone` refuses it —
 * and would be dropped here in any case.
 */
export function contactTelephone(
  contact: DirectorySummaryContact
): string | null {
  if (contact.telephone === null) return null
  return contact.telephoneExtension === null
    ? contact.telephone
    : `${contact.telephone} ext. ${contact.telephoneExtension}`
}

export interface DirectorySummaryClaim {
  kind: CoverageKind
  /** `coverage_value`, the claim as the respondent gave it. */
  value: string
  /**
   * `unmatched_body_text`: the body the respondent named where the controlled
   * list had none. Set exactly on a body claim of `Other` and NULL everywhere
   * else, by a CHECK on the column stating both directions. Render it in place
   * of the word `Other` - see `coverageClaimLabel` below.
   */
  unmatchedBodyText: string | null
}

/**
 * What to show for one claim.
 *
 * `Other` says a checkbox was ticked, which is a fact about the form the
 * entity filled in rather than an answer to what it covers. The name the
 * respondent typed is the answer, so it takes the word's place and the bodies
 * read as one list. The panel adds a line saying which of them was typed
 * rather than chosen; the table cell counts claims and needs no distinction.
 *
 * Not a fallback for a missing value: the CHECK puts the text on the `Other`
 * row and on no other, so this is a substitution between two columns that are
 * never both absent.
 */
export function coverageClaimLabel(claim: DirectorySummaryClaim): string {
  if (claim.unmatchedBodyText !== null) return claim.unmatchedBodyText
  return claim.value
}

/**
 * The entity a designation belongs to, in the two forms a reader needs.
 *
 * `focal_point_designations` records the entity one of two ways, and
 * `chk_focal_point_designations_entity_code_or_unmatched` guarantees exactly
 * one of them: a code from the roster, or free text where the respondent used
 * the picker's "Other" option. The two produce the same pair of slots here, but
 * they are not the same thing, which is why `code` is nullable:
 *
 *   rostered entity   `code` is the roster code; `name` and `entityClass` are
 *                     the display name and the class from
 *                     `mandate_focal_points.entity_display_names`, and are
 *                     NULL when that view has no row for the code.
 *   "Other" entity    `code` is NULL — there is no code, because the entity is
 *                     not on the roster; `name` is the text the respondent
 *                     typed, which is the only name that exists for it, and
 *                     `entityClass` is NULL because nothing classified it.
 *
 * A NULL `name` on a row that HAS a code is a real gap: the entity is rostered
 * but the view does not name it. It is rendered as a gap and never filled in
 * with the code, so the missing name stays visible as something to fix rather
 * than being smoothed over at the point where anyone would notice. The same
 * holds for `entityClass`: NULL renders as an absence, never as a stand-in
 * class.
 */
export interface DirectorySummaryEntity {
  code: string | null
  name: string | null
  /** The stored class as the view carries it; labelled at render time by entityClassLabel. */
  entityClass: string | null
}

export interface DirectorySummaryDesignation {
  id: number
  entity: DirectorySummaryEntity
  /** Division, branch or section. Required, and never blank (CHECK). */
  subUnit: string
  functionalMailbox: string | null
  contacts: DirectorySummaryContact[]
  coverage: DirectorySummaryClaim[]
}
