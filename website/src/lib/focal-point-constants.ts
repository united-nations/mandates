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
 * the controlled list first, then the identifiers an office may know, then the
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

export interface DirectorySummaryContact {
  name: string
  /** Required of a primary contact by CHECK; NULL on an alternate means it was not given. */
  title: string | null
  email: string
  role: 'primary' | 'alternate'
  /** Language codes as given on the form (EN, FR, ES). NULL means unanswered. */
  workingLanguages: string[] | null
}

export interface DirectorySummaryClaim {
  kind: CoverageKind
  /** `coverage_value`, the claim as the respondent gave it. The one to display. */
  value: string
}

/**
 * The office a designation belongs to, in the two forms a reader needs.
 *
 * `focal_point_designations` records the office one of two ways, and
 * `chk_focal_point_designations_office_code_or_unmatched` guarantees exactly
 * one of them: a code from the roster, or free text where the respondent used
 * the picker's "Other" option. The two produce the same pair of slots here, but
 * they are not the same thing, which is why `code` is nullable:
 *
 *   rostered office   `code` is the roster code; `name` is the display name
 *                     from `mandate_focal_points.entity_display_names`, and is
 *                     NULL when that view has no row for the code.
 *   "Other" office    `code` is NULL — there is no code, because the office is
 *                     not on the roster; `name` is the text the respondent
 *                     typed, which is the only name that exists for it.
 *
 * A NULL `name` on a row that HAS a code is a real gap: the office is rostered
 * but the view does not name it. It is rendered as a gap and never filled in
 * with the code, so the missing name stays visible as something to fix rather
 * than being smoothed over at the point where anyone would notice.
 */
export interface DirectorySummaryOffice {
  code: string | null
  name: string | null
}

export interface DirectorySummaryDesignation {
  id: number
  office: DirectorySummaryOffice
  /** Division, branch or section. Required, and never blank (CHECK). */
  subUnit: string
  functionalMailbox: string | null
  contacts: DirectorySummaryContact[]
  coverage: DirectorySummaryClaim[]
}
