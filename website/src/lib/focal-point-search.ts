/**
 * The focal point directory's search: what a row matches on, and why.
 *
 * Pure functions and no database, so the table (a Client Component) can run
 * them on every keystroke and the tests can run them on fixtures. The loader in
 * `lib/data/focal-points.ts` reads the vocabulary tables and hands their rows
 * to `assembleSearchVocabulary`; everything after that is here.
 *
 * THREE WAYS A ROW MATCHES, and the order they are tried in is the order the
 * page explains them in:
 *
 *   own keyword   One of the entity's own keyword claims contains the query.
 *                 Or the query IS a form of a vocabulary term - any live term,
 *                 assigned to anyone - and the keyword contains a form of that
 *                 term's group. So "children" finds a keyword "child
 *                 protection" once child and children are one term. The group
 *                 only widens what a keyword can be found by; the keyword is
 *                 still the entity's own words, and it is what the page shows.
 *   EOSG term     A term EOSG assigned to the entity, or one of its variants,
 *                 contains the query. The page says the entity is relevant to
 *                 the term, never that the entity claimed it.
 *   other field   Names, titles, addresses, telephone numbers, languages, the
 *                 entity and its sub-unit, and the bodies, agenda items and
 *                 document symbols claimed. Matched as before, and not
 *                 explained: see the note at the table's placeholder for why
 *                 those three kinds are searchable but not advertised.
 *
 * Every match is a stored string containing the query, or the query equalling
 * a stored form. No fuzzy distance, no stemming, no ranking: each row that
 * appears can be explained by a term someone wrote down, and the order of the
 * results is the order of the directory.
 */

import {
  coverageClaimLabel,
  entityClassGroupLabel,
  entityClassLabel,
  type DirectorySummaryDesignation,
  type SearchVocabularyTerm,
} from '#lib/focal-point-constants'

/**
 * A `search_vocabulary_terms` row, as selected. Only live rows reach here: the
 * query filters on `retired_at IS NULL`, beside the listing rules.
 */
export interface SearchVocabularyTermRow {
  id: number
  term_text: string
  term_text_normalised: string
  /** NULL means the term has no variants; never an empty array, by CHECK. */
  term_variants_normalised: string[] | null
}

/**
 * A `search_vocabulary_assignments` row, as selected. Only live assignments to
 * live terms reach here: the query filters both `retired_at` columns.
 */
export interface SearchVocabularyAssignmentRow {
  entity_code: string
  search_vocabulary_term_id: number
}

export interface SearchVocabulary {
  /** Every live term: the variant groups the own-keyword match reads. */
  terms: SearchVocabularyTerm[]
  /** Each entity's assigned terms, in the order the term rows came. */
  termsByEntity: Map<string, SearchVocabularyTerm[]>
}

/**
 * The live terms and each entity's share of them, from the two tables' rows.
 *
 * An assignment naming a term that is not among the rows is a broken read -
 * the query joins the assignment to a live term, so it cannot happen - and it
 * throws with both ids rather than being skipped.
 */
export function assembleSearchVocabulary(
  termRows: SearchVocabularyTermRow[],
  assignmentRows: SearchVocabularyAssignmentRow[]
): SearchVocabulary {
  const byId = new Map<number, SearchVocabularyTerm>()
  const terms = termRows.map((row) => {
    const term: SearchVocabularyTerm = {
      text: row.term_text,
      // NULL variants is "none", per the column's comment: the group is then
      // the term's own form alone.
      forms: [row.term_text_normalised, ...(row.term_variants_normalised ?? [])],
    }
    byId.set(row.id, term)
    return term
  })

  const termsByEntity = new Map<string, SearchVocabularyTerm[]>()
  for (const row of assignmentRows) {
    const term = byId.get(row.search_vocabulary_term_id)
    if (term === undefined) {
      throw new Error(
        `search_vocabulary_assignments for ${row.entity_code} names term id=${row.search_vocabulary_term_id}, which is not a live term`
      )
    }
    const list = termsByEntity.get(row.entity_code) ?? []
    list.push(term)
    termsByEntity.set(row.entity_code, list)
  }

  return { terms, termsByEntity }
}

/**
 * The form both sides are compared in: trimmed, inner whitespace runs as one
 * space, lowercased. Applied to the query and to every stored string at
 * comparison time, as the search always has, so a keyword typed with a double
 * space still matches and nothing stored is rewritten.
 */
export function normaliseSearchText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** One designation's searchable text, prepared once rather than per keystroke. */
export interface DesignationSearchIndex {
  /** The entity's own keyword claims, in the order the designation holds them. */
  keywords: { shown: string; normalised: string }[]
  /** The entity's assigned EOSG terms, in term order. */
  terms: { shown: string; forms: string[] }[]
  /** Every other searchable field, joined into one string. */
  other: string
}

/**
 * Prepares a designation for matching.
 *
 * The other fields are one joined string, as the whole row used to be: a query
 * that spans two adjacent fields still matches the way it did. Keywords and
 * terms are kept apart because the page has to say which one matched.
 *
 * The class label is included only while the class is rendered, so a search
 * cannot match on something the page does not show. Contacts are all of them,
 * alternates included, though the table shows primaries only: the alternate is
 * on the record the row opens, so a search for them finds where they are.
 *
 * `filter(Boolean)` drops absent fields rather than defaulting them - a
 * designation with no functional mailbox contributes no text for one.
 */
export function designationSearchIndex(
  designation: DirectorySummaryDesignation,
  showsEntityClass: boolean
): DesignationSearchIndex {
  const keywords = designation.coverage
    .filter((claim) => claim.kind === 'keyword')
    .map((claim) => {
      const shown = coverageClaimLabel(claim)
      return { shown, normalised: normaliseSearchText(shown) }
    })

  const terms = designation.entity.searchTerms.map((term) => ({
    shown: term.text,
    forms: term.forms.map(normaliseSearchText),
  }))

  const other = [
    designation.entity.name,
    designation.entity.code,
    showsEntityClass && designation.entity.entityClass !== null
      ? [
          entityClassLabel(designation.entity.entityClass),
          entityClassGroupLabel(designation.entity.entityClass),
        ].join(' ')
      : null,
    designation.subUnit,
    designation.functionalMailbox,
    ...designation.contacts.flatMap((contact) => [
      contact.name,
      contact.title,
      contact.email,
      // The number and the extension as two entries rather than the joined
      // string, so that either matches on its own. Stored as typed and not
      // normalised, so a number pasted in a different spacing from the one the
      // entity wrote will not be found: the page does not decide which two
      // numbers are the same number.
      contact.telephone,
      contact.telephoneExtension,
      ...(contact.workingLanguages ?? []),
    ]),
    // The claim as it renders, so a reader searching for the body an entity
    // named itself finds the row: `claim.value` is the word "Other" there.
    ...designation.coverage
      .filter((claim) => claim.kind !== 'keyword')
      .map(coverageClaimLabel),
  ]
    .filter((text): text is string => Boolean(text))
    .map(normaliseSearchText)
    .join(' ')

  return { keywords, terms, other }
}

/**
 * Every form of every live term that has the query as one of its forms.
 *
 * Equality, not containment: "child" widens to children, but "chi" widens to
 * nothing, or a three-letter query would pull in every group with a form
 * starting that way. Computed once per query and shared by all rows.
 */
export function queryVariantForms(
  needle: string,
  vocabulary: SearchVocabularyTerm[]
): string[] {
  const forms = new Set<string>()
  for (const term of vocabulary) {
    const group = term.forms.map(normaliseSearchText)
    if (group.includes(needle)) for (const form of group) forms.add(form)
  }
  return Array.from(forms)
}

/** Why a row is in the results. `other` is a match the page does not explain. */
export type SearchMatch =
  | { on: 'keyword'; keyword: string }
  | { on: 'term'; term: string }
  | { on: 'other' }

/**
 * Whether a row matches, and on what, or null where it does not.
 *
 * `needle` is the normalised query and must not be empty: an empty query lists
 * every row and explains none, which is the caller's branch, not a match.
 *
 * The precedence is fixed. An own keyword wins over an EOSG term even when
 * both match, because the entity's own words are the stronger statement; and
 * of several keywords, the first in the designation's order is the one shown.
 */
export function matchSearch(
  index: DesignationSearchIndex,
  needle: string,
  variantForms: string[]
): SearchMatch | null {
  if (needle === '') {
    throw new Error('matchSearch needs a non-empty query')
  }

  const keyword = index.keywords.find(
    (kw) =>
      kw.normalised.includes(needle) ||
      variantForms.some((form) => kw.normalised.includes(form))
  )
  if (keyword !== undefined) return { on: 'keyword', keyword: keyword.shown }

  const term = index.terms.find((t) =>
    t.forms.some((form) => form.includes(needle))
  )
  if (term !== undefined) return { on: 'term', term: term.shown }

  if (index.other.includes(needle)) return { on: 'other' }

  return null
}
