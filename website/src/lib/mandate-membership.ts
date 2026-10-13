/** Shared registry membership; counts and click destinations use the same universe. */
export function versionPredicateSql(
  citationAlias: string,
  versionParam: string
): string {
  // Written as an UNCORRELATED subquery on purpose. The obvious form —
  // EXISTS (... AND <alias>.origin_document ~ bd.match_pattern) — references
  // the outer row, so Postgres must re-run the regex join for every citation
  // row it tests, in each of the ~30 queries an explorer render fires.
  //
  // The regex only ever resolves origin_document to a budget document, and
  // there are just 11 distinct origin_document values against 5 anchored
  // patterns. Matching the distinct values first makes the subquery
  // independent of the outer row, so it is evaluated ONCE per query and the
  // result reused as a hashed IN test. Same rows out (verified against both
  // version slugs and the default), materially less work per query.
  return `${citationAlias}.origin_document IN (
      SELECT o.origin_document
      FROM (
        SELECT DISTINCT origin_document
        FROM ppb2026.source_document_citations
        WHERE origin_document IS NOT NULL
      ) o
      JOIN ppb2026.budget_documents bd
        ON o.origin_document ~ bd.match_pattern
      JOIN ppb2026.budget_document_versions bdv ON bdv.doc_slug = bd.slug
      WHERE bdv.version_slug = COALESCE(
        ${versionParam},
        (SELECT slug FROM ppb2026.budget_versions WHERE is_default LIMIT 1)
      )
    )`
}

/** The explorer's registered catalogue plus the selected version's cited documents.
 * Build the cited symbol set once rather than repeating a correlated lookup per document.
 * No document-type label or body label is required: both can legitimately be NULL.
 */
export function mandateMembershipSql(
  documentAlias: string,
  versionParam = 'NULL::text'
) {
  return `(
      ${documentAlias}.is_catalog_pattern
      OR ${documentAlias}.ppb_full_document_symbol IN (
        SELECT c_cat.ppb_full_document_symbol
        FROM ppb2026.source_document_citations c_cat
        WHERE ${versionPredicateSql('c_cat', versionParam)}
      )
    )`
}
