# Paragraph fulltext: two corpora, one contract

The mandate detail page (`/mandate/*`, full page + intercepting modal) renders
paragraph-level fulltext via `ParagraphsSection`, fed by
`getParagraphsBySymbol` in `src/lib/data/paragraphs.ts`. Two corpora back it:

| Corpus | Table | Coverage | Extras |
| --- | --- | --- | --- |
| Mandates (rich) | `mandates.paragraphs` (+ `paragraph_links`) | ~2.8k PPB-cited docs | mandate-NER objects, `text_with_highlights`, linked-symbol pairs |
| Digital Library | `digitallibrary.document_paragraphs` (lang=`en`) | 1.3k+ resolutions/PRSTs, growing to ~15–20k | semantic fulltext only (no NER) |

## Precedence and the view

`public.unified_paragraphs` (migration `029`, re-runnable def in
`sql/schema/mandates.sql`) unions the two with the same precedence as
`unified_documents`: a symbol present in `mandates.paragraphs` is served
verbatim from there; every other symbol falls back to the Digital Library arm,
mapped into the legacy column contract. Membership uses the app-wide
whitespace/upper-case normalized symbol comparison.

**The website does not `SELECT` from the view.** The view's precedence
anti-join full-scans `mandates.paragraphs` (~120 ms). Instead
`getParagraphsBySymbol` runs the two arms as separate per-symbol,
index-driven queries (`idx_paragraphs_symbol` / `idx_document_paragraphs_symbol`,
<10 ms) with fallback — mandates arm first, Digital Library arm only when it
returns nothing — which reproduces the view's precedence exactly. The view
remains the declarative artifact for external/ad-hoc consumers.

## Type mapping (Digital Library → legacy UI vocabulary)

`ParagraphsSection` only special-cases `type='heading'`, renders
`paragraph_type IN ('operative','preambular')` as body boxes (preambular
collapsed under a toggle), and hides everything else under its permanent
`operative` filter. So the Digital Library `type` vocabulary is carried through
**verbatim** and is render-safe as-is:

- `heading` → heading (uses `heading_level`, feeds the TOC).
- `opening` (`The Security Council,` …) → already `paragraph_type='preambular'`; joins the collapsible preamble.
- `paragraph` → carries `operative`/`preambular`/`null` unchanged.
- `title`, `footnote`, `signature`, `vote_record`, `table`, `divider`, non-masthead `frontmatter` → all `paragraph_type IS NULL`, so hidden by the operative filter (no UI change needed).
- `frontmatter` + `subtype='masthead'` → **excluded from the view/query** (pure document boilerplate).

`hyperlinks` `[{text,url}]` is mapped to the legacy `[[label,url]]` link-pair
shape the renderer auto-links against. `section` / `annex_index` / `text_index`
ride along on the `Paragraph` type (optional) but are not consumed yet.

## Follow-up ideas (not implemented)

- **Annex sections**: Digital Library annex operatives carry
  `paragraph_type='operative'` with `section='annex'`; today they mix into the
  main operative list. A visual annex divider keyed on `section` would separate
  them.
- **Vote records**: `vote` / `vote_summary` JSONB on `vote_record` rows is not
  surfaced (no column in the contract). A vote panel could render tallies.
- **Sub-resolution blocks / omnibus**: `subtype='subres'` headings and
  `text_index` block ordinals could drive per-resolution sections for
  consolidated documents (e.g. `A/RES/48/75` A–L).
- **Footnotes**: `footnote` rows + `note_ids` are carried but hidden; a
  footnote apparatus could link body references to notes.
