# Fulltext integration contract

The document detail uses English `digitallibrary.document_paragraphs` only,
joined to a `document_files` record with status `parsed` and a matching
`document_parses` record. The legacy `mandates.paragraphs` corpus is not a
fallback. This is eligibility, not a new source-fidelity certification.

Deployment depends on the corpus recovery work: retained semantic rows whose
latest ledger status is `parse_failed` remain unavailable. In particular, do
not reset the roughly 22,200 missing-source failures to make this interface
populate. Recover and validate them first, or explicitly accept reduced
coverage before deploying this source switch.

## Presentation

Masthead exclusions are NULL-safe. Normal documents retain their existing
frontmatter/title exclusions; documents with no substantive body can promote
non-masthead frontmatter, then title text. Empty elements never qualify as a
body. Tables and footnotes are readable text; this change does not reconstruct
the original table grid. Annex and appendix structure remains in the existing
renderer. Preamble-only documents render their text inline. Mixed documents retain the
collapsible preamble; searching moves those clauses inline so matching preamble
text remains reachable. Search and annotation filters intentionally narrow
visible content.

A resolution symbol ending in one bracketed letter can resolve to an accepted
parent document. A unique printed `subres` heading determines the block;
ordinal positions never stand in for letters. Missing or ambiguous blocks,
compound expressions and multi-letter Roman expressions remain unavailable,
rather than displaying the entire parent under a part's title. Resolved rows
carry `source_symbol` and `part_letter`, shown below the section heading.

The resolver needs no alias-view migration. It uses existing source columns and
selects the parent's current block identifiers on each request.

## Checks

`node --test src/lib/paragraph-presentation.test.ts` verifies nine cases across
NULL subtypes, title fallback, boilerplate exclusion, substantive annex/table/
footnote retention, symbol normalization, exact block conservation and ambiguous
blocks. These tests do not certify historical source fidelity or corpus-wide
coverage; the independent recovery process owns those checks.

## Measured coverage consequence (2026-09-14)

The independent read-only review found 2,829 distinct symbols in the legacy corpus and 3,589 directly eligible Digital Library symbols. **All 2,829 legacy symbols currently lack a direct eligible Digital Library row.** Bracket-part resolution can recover some aliases, so this is not an exact final page-loss count. It is nonetheless a complete loss of direct legacy-backed coverage under the source switch. Keep this fulltext commit separate from the metric columns: do not release it without corpus recovery or explicit acceptance of this measured reduction.
