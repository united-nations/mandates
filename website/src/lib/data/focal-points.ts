/**
 * Focal Point Directory Data Access
 *
 * Reads the `mandate_focal_points` schema, which is written by a separate
 * internal application. This site only ever reads it, and the credential it
 * reads with (`mandates_readonly`) holds SELECT on exactly five tables:
 *
 *   focal_point_designations      the portfolio
 *   designation_contacts          the people on it
 *   designation_coverage_claims   what it says it covers
 *   search_vocabulary_terms       EOSG's search terms, with their variants
 *   search_vocabulary_assignments which entities each term finds
 *
 * The last two are EOSG's, not the entities': search input that is never shown
 * as coverage. See `lib/focal-point-search.ts`.
 *
 * plus one view:
 *
 *   entity_display_names          entity_code -> entity_display_name,
 *                                 entity_class, public_listing_status
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
 * A THIRD now governs it, and it is not a column on the designation at all:
 *
 *   public_listing_status  on `candidate_entities`, reached through
 *                          `entity_display_names`. `listed` means the Chef de
 *                          Cabinet's memo of 14 September 2026 asked this
 *                          entity to designate a focal point; `not_listed`
 *                          means it did not.
 *
 * A row with any of the three against it is excluded.
 *
 * The third is a different KIND of rule from the other two and the difference
 * is worth holding onto. `superseded_at` and `listing_removed_at` are facts
 * about a designation - it was replaced, or the entity took it down.
 * `public_listing_status` is a fact about the ENTITY, and it is a distribution
 * decision rather than a property: management wants this page to show the
 * entities it asked and only those, while the form's own picker keeps offering
 * every entity the roster includes. So an entity that finds the form and
 * designates without having been asked is recorded upstream, is visible on the
 * internal directory and on its own record, and does not appear here. Around
 * 36 included entities are in that position, which is the intended state and
 * not a gap.
 *
 * It is not derived from `entity_class`, upstream or here. The memo's
 * addressees happen to sit inside a describable set of classes today, which is
 * exactly why a class filter would work now and be wrong the first time
 * management adds an addressee.
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
  type SearchVocabularyTerm,
} from '../focal-point-constants'
import {
  assembleSearchVocabulary,
  type SearchVocabularyAssignmentRow,
  type SearchVocabularyTermRow,
} from '../focal-point-search'
import { queryMany } from '../db/query'

/** The page's data: the designations, and every live term for the search. */
export interface FocalPointDirectorySummary {
  designations: DirectorySummaryDesignation[]
  /**
   * Every live search term, assigned or not. The search reads their variant
   * groups to widen a query before matching the entities' own keywords; it is
   * never rendered.
   */
  searchVocabulary: SearchVocabularyTerm[]
}

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
  person_telephone: string | null
  person_telephone_extension: string | null
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
 * The designations this page lists, with their current people, their
 * coverage claims and their entities' search terms; and the live search
 * vocabulary.
 *
 * Separate queries rather than one with aggregated JSON. The page holds a handful
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
async function loadFocalPointDirectorySummary(): Promise<FocalPointDirectorySummary> {
  const designations = await queryMany<DesignationRow>(
    // A LEFT JOIN, not an inner one: an entity whose code the view does not
    // name must still appear, with the gap visible. An inner join would drop
    // the designation and the gap with it.
    //
    // The join cannot multiply rows. `entity_code` is a foreign key onto
    // `candidate_entities.entity_code`, so that column is unique, and the view
    // is keyed on it.
    //
    // THE THREE LISTING RULES ARE HERE, TOGETHER, AND THAT IS DELIBERATE. The
    // query is where the other two already were, so putting the third beside
    // them keeps the whole of what this page shows in one readable clause
    // rather than splitting it between a WHERE and a filter applied to the
    // rows afterwards. A reader asking "why is this entity not on the page"
    // has one place to look, and the query does not return rows it then
    // discards.
    //
    // `n.public_listing_status = 'listed'` ALSO EXCLUDES THE OFF-ROSTER
    // DESIGNATIONS, and that is intended rather than incidental. A designation
    // whose entity was not on the roster carries `unmatched_entity_text` and a
    // NULL `entity_code`, so the LEFT JOIN finds no view row, the comparison
    // is NULL, and the row drops. That is the right answer: an entity the
    // roster does not know cannot have been on a distribution list, so
    // management did not ask it, so it is not published. It remains recorded
    // and remains visible internally.
    //
    // It is the ONLY way the comparison can be NULL. `entity_code` is a
    // foreign key, the view selects every row of the table it reads, and
    // `public_listing_status` is NOT NULL there - so a designation with a code
    // always finds a row with a value. The gap the LEFT JOIN exists for is a
    // missing `entity_display_name`, not a missing row, and a row in that
    // state still carries a listing status and is still shown.
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
        AND n.public_listing_status = 'listed'
      ORDER BY n.entity_display_name NULLS LAST,
               d.unmatched_entity_text NULLS LAST,
               d.sub_unit,
               d.id`,
    []
  )

  if (designations.length === 0) {
    return { designations: [], searchVocabulary: [] }
  }

  const ids = designations.map((d) => d.id)
  const entityCodes = Array.from(
    new Set(
      designations
        .map((d) => d.entity_code)
        .filter((code): code is string => code !== null)
    )
  )

  const [contacts, claims, termRows, assignmentRows] = await Promise.all([
    // Current people only. `valid_to` is set when someone leaves rather than
    // the row being deleted, so the departed are still here; a directory of who
    // to contact must not offer them.
    queryMany<ContactRow>(
      `/* trace:focalPoints.contacts */
       SELECT designation_id,
              person_name,
              person_title,
              person_email,
              person_telephone,
              person_telephone_extension,
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
    // Every live term, not only the assigned ones. Its variant group is what
    // lets "children" find an entity's own keyword "child protection", and
    // that is a fact about the words, not about which entity EOSG gave the term
    // to. A retired term finds nothing; it is kept upstream so what the search
    // once matched on stays answerable.
    queryMany<SearchVocabularyTermRow>(
      `/* trace:focalPoints.searchTerms */
       SELECT id,
              term_text,
              term_text_normalised,
              term_variants_normalised
         FROM mandate_focal_points.search_vocabulary_terms
        WHERE retired_at IS NULL
        ORDER BY term_text_normalised`,
      []
    ),
    // Terms attach to the ENTITY, not the designation: two designations from
    // one entity share them. Live assignments to live terms only - a live
    // assignment of a retired term is retired with it.
    queryMany<SearchVocabularyAssignmentRow>(
      `/* trace:focalPoints.searchAssignments */
       SELECT a.entity_code,
              a.search_vocabulary_term_id
         FROM mandate_focal_points.search_vocabulary_assignments a
         JOIN mandate_focal_points.search_vocabulary_terms t
           ON t.id = a.search_vocabulary_term_id
        WHERE a.entity_code = ANY($1::text[])
          AND a.retired_at IS NULL
          AND t.retired_at IS NULL
        ORDER BY a.entity_code, t.term_text_normalised`,
      [entityCodes]
    ),
  ])

  const vocabulary = assembleSearchVocabulary(termRows, assignmentRows)

  const contactsByDesignation = new Map<number, DirectorySummaryContact[]>()
  for (const row of contacts) {
    const list = contactsByDesignation.get(row.designation_id) ?? []
    list.push({
      name: row.person_name,
      title: row.person_title,
      email: row.person_email,
      // Both passed through as stored. Neither is reformatted here or
      // anywhere downstream: the column holds what a respondent typed, and
      // this page is not the place to decide what a telephone number ought to
      // look like. NULL stays NULL and renders as absence.
      telephone: row.person_telephone,
      telephoneExtension: row.person_telephone_extension,
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

  return {
    designations: designations.map((row) => ({
      id: row.id,
      entity: entityOf(row, vocabulary.termsByEntity),
      subUnit: row.sub_unit,
      functionalMailbox: row.functional_mailbox,
      contacts: contactsByDesignation.get(row.id) ?? [],
      coverage: claimsByDesignation.get(row.id) ?? [],
    })),
    searchVocabulary: vocabulary.terms,
  }
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
function entityOf(
  row: DesignationRow,
  termsByEntity: Map<string, SearchVocabularyTerm[]>
): DirectorySummaryEntity {
  if (row.entity_code !== null) {
    return {
      code: row.entity_code,
      name: row.entity_display_name,
      entityClass: row.entity_class,
      // An entity EOSG has assigned no term has no assignment rows, so its
      // list is empty because nothing was put in it.
      searchTerms: termsByEntity.get(row.entity_code) ?? [],
    }
  }
  if (row.unmatched_entity_text !== null) {
    // Not on the roster, so there is no code and nothing for the view to name
    // or classify. The typed text is not a stand-in for a lookup that failed;
    // it is the only name this entity has. No assignment can name it either:
    // `search_vocabulary_assignments.entity_code` is NOT NULL.
    return {
      code: null,
      name: row.unmatched_entity_text,
      entityClass: null,
      searchTerms: [],
    }
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
