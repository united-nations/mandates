/**
 * Focal Point Directory Data Access
 *
 * Reads the `mandate_focal_points` schema, which is written by a separate
 * internal application. This site only ever reads it, and the credential it
 * reads with (`mandates_readonly`) holds SELECT on exactly three tables:
 *
 *   focal_point_designations      the portfolio
 *   designation_contacts          the people on it
 *   designation_coverage_claims   what it says it covers
 *
 * plus one view:
 *
 *   entity_display_names          entity_code -> entity_display_name, entity_class
 *
 * and nothing else in that schema. `focal_point_designations.entity_code` is a
 * foreign key into `candidate_entities`, which this credential still cannot read
 * and must not: that table carries scope decisions and a written exclusion
 * reason on every row, including entities ruled out, entities awaiting a
 * ruling and entities nobody has considered. The view exists so a consumer can
 * name an entity without seeing any of that, and it exposes those three columns
 * and nothing else: the class is a classification the focal points application
 * made, not a ruling, which is why it was allowed to travel. Join the view;
 * never reach past it.
 *
 * THE SUMMARY CUT
 * ---------------
 * This is the "directory summary" column set: the same designations the
 * internal directory lists, minus the administrative record — who cleared it,
 * who submitted it, when, whether the entity leads or shares, who removed a
 * listing, and the whole supersession history. Those columns are not selected
 * by any query in this file. The cut is by column KIND (administrative vs.
 * contact), which is why it is named for that property rather than for who is
 * allowed to see it.
 *
 * WHAT IS LISTED
 * --------------
 * Two columns govern it, and they are independent:
 *
 *   superseded_at        NULL means this designation is live. A replacement is
 *                        a new row, and the row it replaces gets this set.
 *   listing_removed_at   NULL means it is still shown. Set when the entity took
 *                        the designation off the site. The column's own comment
 *                        requires every read that renders designations to a user
 *                        to exclude these, because the record is kept on purpose
 *                        and the exclusion is a read-time decision.
 *
 * A row with either one set is excluded, and those two are now the whole of
 * the listing rule.
 *
 * `listing_removed_at` now reaches rows that are NOT superseded. Upstream, a
 * CHECK allowed removal only of an already-superseded designation, so every
 * removed row was in practice excluded twice over and this query's second
 * predicate had nothing of its own to do. That CHECK was dropped on
 * 17 September 2026: an entity whose focal point had left was being made to
 * display a stale name here until it invented a replacement, and no name routes
 * a delegation better than a name that does not answer. So an entity can now
 * take its current designation off the site, and this page is where that takes
 * effect. Nothing in the query changes - the predicate that was redundant is
 * now the one doing the work, and it was already correct.
 *
 * The record shapes and the coverage vocabulary are in
 * `lib/focal-point-constants.ts` rather than here: the table and the panel are
 * Client Components and need them at runtime, and they must not reach a module
 * that imports the database helpers to get them.
 */

import { cache } from 'react'
import {
  COVERAGE_KINDS,
  type CoverageKind,
  type DirectorySummaryClaim,
  type DirectorySummaryContact,
  type DirectorySummaryDesignation,
  type DirectorySummaryEntity,
} from '../focal-point-constants'
import { queryMany } from '../db/query'

interface DesignationRow {
  id: number
  entity_code: string | null
  unmatched_entity_text: string | null
  entity_display_name: string | null
  entity_class: string | null
  sub_unit: string
  functional_mailbox: string | null
}

interface ContactRow {
  designation_id: number
  person_name: string
  person_title: string | null
  person_email: string
  working_languages: string[] | null
  contact_role: string
}

interface ClaimRow {
  designation_id: number
  coverage_kind: string
  coverage_value: string
  unmatched_body_text: string | null
}

/**
 * The designations this page lists, with their current people and their
 * coverage claims.
 *
 * Three queries rather than one with aggregated JSON. The page holds a handful
 * of rows, the pool already fans out far more than this per render, and the
 * alternative needs a COALESCE around each `json_agg` to turn "no rows" into an
 * empty array — a default standing in for an absence that is not one. Here an
 * entity with no claims simply has no claim rows, and its array is empty
 * because nothing was put in it.
 *
 * This file used to carry a paragraph explaining why it did not filter on
 * `scope`, a column separating Secretariat technical focal points from the
 * wider system contact points. That column has been dropped upstream: there is
 * no second population and there was never a second round, so the distinction
 * named nothing. `superseded_at` and `listing_removed_at` are the two
 * conditions that govern listing, and now the only two.
 */
async function loadFocalPointDirectorySummary(): Promise<
  DirectorySummaryDesignation[]
> {
  const designations = await queryMany<DesignationRow>(
    // A LEFT JOIN, not an inner one: an entity whose code the view does not
    // name must still appear, with the gap visible. An inner join would drop
    // the designation and the gap with it.
    //
    // The join cannot multiply rows. `entity_code` is a foreign key onto
    // `candidate_entities.entity_code`, so that column is unique, and the view
    // is keyed on it.
    //
    // Ordered by what the reader actually sees. NULLS LAST rather than a
    // COALESCE onto the code: the order is over the displayed name, and a row
    // with no name has no place among the named ones.
    `/* trace:focalPoints.directorySummary */
     SELECT d.id,
            d.entity_code,
            d.unmatched_entity_text,
            n.entity_display_name,
            n.entity_class,
            d.sub_unit,
            d.functional_mailbox
       FROM mandate_focal_points.focal_point_designations d
       LEFT JOIN mandate_focal_points.entity_display_names n
              ON n.entity_code = d.entity_code
      WHERE d.superseded_at IS NULL
        AND d.listing_removed_at IS NULL
      ORDER BY n.entity_display_name NULLS LAST,
               d.unmatched_entity_text NULLS LAST,
               d.sub_unit,
               d.id`,
    []
  )

  if (designations.length === 0) return []

  const ids = designations.map((d) => d.id)

  const [contacts, claims] = await Promise.all([
    // Current people only. `valid_to` is set when someone leaves rather than
    // the row being deleted, so the departed are still here; a directory of who
    // to contact must not offer them.
    queryMany<ContactRow>(
      `/* trace:focalPoints.contacts */
       SELECT designation_id,
              person_name,
              person_title,
              person_email,
              working_languages,
              contact_role
         FROM mandate_focal_points.designation_contacts
        WHERE designation_id = ANY($1::int[])
          AND valid_to IS NULL
        ORDER BY designation_id,
                 (contact_role = 'primary') DESC,
                 person_name`,
      [ids]
    ),
    // `unmatched_body_text` is the body a respondent named where the
    // controlled list had none. It is selected because the alternative is a
    // page that renders the word `Other` and tells the reader nothing; see
    // `coverageClaimLabel`. A coverage column rather than an administrative
    // one, so it is inside the summary cut rather than an exception to it.
    queryMany<ClaimRow>(
      `/* trace:focalPoints.coverage */
       SELECT designation_id,
              coverage_kind,
              coverage_value,
              unmatched_body_text
         FROM mandate_focal_points.designation_coverage_claims
        WHERE designation_id = ANY($1::int[])
        ORDER BY designation_id, coverage_kind, coverage_value`,
      [ids]
    ),
  ])

  const contactsByDesignation = new Map<number, DirectorySummaryContact[]>()
  for (const row of contacts) {
    const list = contactsByDesignation.get(row.designation_id) ?? []
    list.push({
      name: row.person_name,
      title: row.person_title,
      email: row.person_email,
      role: asContactRole(row.contact_role),
      workingLanguages: row.working_languages,
    })
    contactsByDesignation.set(row.designation_id, list)
  }

  const claimsByDesignation = new Map<number, DirectorySummaryClaim[]>()
  for (const row of claims) {
    const list = claimsByDesignation.get(row.designation_id) ?? []
    list.push({
      kind: asCoverageKind(row.coverage_kind),
      value: row.coverage_value,
      // Passed through as stored, NULL included. NULL is the state of every
      // claim but a body of `Other`, and it is an absence rather than a value
      // withheld; nothing substitutes the coverage value for it here, because
      // the two are different columns answering different questions.
      unmatchedBodyText: row.unmatched_body_text,
    })
    claimsByDesignation.set(row.designation_id, list)
  }

  return designations.map((row) => ({
    id: row.id,
    entity: entityOf(row),
    subUnit: row.sub_unit,
    functionalMailbox: row.functional_mailbox,
    contacts: contactsByDesignation.get(row.id) ?? [],
    coverage: claimsByDesignation.get(row.id) ?? [],
  }))
}

export const getFocalPointDirectorySummary = cache(
  loadFocalPointDirectorySummary
)

/**
 * The entity, as a code and a name.
 *
 * `chk_focal_point_designations_entity_code_or_unmatched` guarantees exactly one
 * of `entity_code` and `unmatched_entity_text` is set, so the two branches below
 * are exhaustive. Neither being set is a broken row and throws rather than
 * rendering as "Unknown": a broken row nobody finds is worse than a crash with
 * the id in it.
 *
 * The rostered branch passes the view's name through UNCHANGED, including when
 * it is NULL. That NULL means the roster names an entity the view does not, and
 * it is carried to the surface as an absence. Substituting the code here is the
 * one thing this function must not do — the code is not the entity's name, and
 * a page that quietly prints one where the other is missing looks correct while
 * the gap goes unnoticed and unfixed. The class is treated the same way: NULL
 * from the view is NULL here, and a value passes through as stored. It is not
 * checked against the label list: the CHECK on the source column already
 * holds it to the nine known values, so a check here would guard a state the
 * schema cannot produce, and the cell labels what it knows and shows the rest
 * as stored.
 */
function entityOf(row: DesignationRow): DirectorySummaryEntity {
  if (row.entity_code !== null) {
    return {
      code: row.entity_code,
      name: row.entity_display_name,
      entityClass: row.entity_class,
    }
  }
  if (row.unmatched_entity_text !== null) {
    // Not on the roster, so there is no code and nothing for the view to name
    // or classify. The typed text is not a stand-in for a lookup that failed;
    // it is the only name this entity has.
    return { code: null, name: row.unmatched_entity_text, entityClass: null }
  }
  throw new Error(
    `focal_point_designations id=${row.id} has neither entity_code nor unmatched_entity_text`
  )
}

/** `designation_contacts_contact_role_check` allows exactly these two. */
function asContactRole(value: string): DirectorySummaryContact['role'] {
  if (value !== 'primary' && value !== 'alternate') {
    throw new Error(`Unrecognised designation_contacts.contact_role: ${value}`)
  }
  return value
}

/**
 * `designation_coverage_claims_coverage_kind_check` allows exactly the four in
 * COVERAGE_KINDS. A new kind has no heading on this page and no place in the
 * reading order, so it stops here with its own name in the message rather than
 * appearing under a borrowed label.
 */
function asCoverageKind(value: string): CoverageKind {
  if (!(COVERAGE_KINDS as readonly string[]).includes(value)) {
    throw new Error(
      `Unrecognised designation_coverage_claims.coverage_kind: ${value}`
    )
  }
  return value as CoverageKind
}
