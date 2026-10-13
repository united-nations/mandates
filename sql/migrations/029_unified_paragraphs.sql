-- ===========================================================================
-- 029_unified_paragraphs.sql
-- Unified paragraph-level fulltext view combining the two paragraph corpora,
-- mirroring the precedence model of public.unified_documents (migration 008).
--
--   Arm 1 (wins)  mandates.paragraphs — the richer, mandate-NER-tagged corpus
--                 (~2.8k PPB-cited docs). Rows are exposed verbatim, including
--                 the mandates JSONB and the aggregated paragraph_links pairs.
--   Arm 2 (fill)  digitallibrary.document_paragraphs (lang = 'en') — the
--                 semantic fulltext layer for UN resolutions/PRSTs. Only symbols
--                 NOT present in mandates.paragraphs surface here, mapped into
--                 the legacy column contract the UI consumes.
--
-- Membership / precedence uses the same whitespace/upper-case normalized symbol
-- comparison as unified_documents. mandates.paragraphs.document_symbol is stored
-- in display form (e.g. 'A/RES/77/230'), which already matches
-- digitallibrary.document_paragraphs.symbol_normalized, so the DL arm exposes
-- symbol_normalized directly as the display document_symbol.
--
-- Per-symbol lookups stay index-driven on both arms:
--   Arm 1  mandates.paragraphs   -> idx_paragraphs_symbol (document_symbol)
--   Arm 2  document_paragraphs   -> idx_document_paragraphs_symbol (symbol_normalized, lang)
--
-- Type mapping (DL -> legacy UI vocabulary): the UI only special-cases
-- type='heading', renders paragraph_type in ('operative','preambular') as body
-- boxes (preambular collapsed), and hides everything else (paragraph_type IS
-- NULL, non-heading) under its permanent 'operative' filter. DL 'type' values
-- are therefore carried through verbatim: 'heading' renders as a heading;
-- 'opening' already carries paragraph_type='preambular' so it joins the preamble;
-- 'paragraph' carries operative/preambular/null as-is; and the structural
-- element types ('title','footnote','signature','vote_record','table','divider',
-- 'frontmatter') all carry paragraph_type IS NULL and so stay hidden — no UI
-- change is required for render-safety. masthead frontmatter is pure document
-- boilerplate and is excluded from the view entirely.
-- ===========================================================================

CREATE OR REPLACE VIEW public.unified_paragraphs AS
-- Arm 1: mandates.paragraphs (verbatim; wins for any symbol present here)
SELECT
    p.id,
    p.document_symbol,
    p.position,
    p.text,
    p.type,
    p.heading_level,
    p.paragraph_type,
    p.paragraph_level,
    p.prefix,
    p.text_with_highlights,
    p.uncertainties,
    p.mandates,
    COALESCE(
        (
            SELECT json_agg(
                       json_build_array(pl.linked_symbol, pl.linked_url)
                       ORDER BY pl.id
                   )
            FROM mandates.paragraph_links pl
            WHERE pl.paragraph_id = p.id
        ),
        '[]'::json
    ) AS links,
    -- Extra columns (UI ignores these today; harmless / for future use).
    NULL::text AS section,
    NULL::smallint AS annex_index,
    NULL::smallint AS text_index,
    true AS is_mandates
FROM mandates.paragraphs p

UNION ALL

-- Arm 2: digitallibrary.document_paragraphs (mapped; only symbols absent from Arm 1)
SELECT
    dp.id,
    dp.symbol_normalized AS document_symbol,
    dp.position,
    dp.text,
    dp.type,
    dp.heading_level,
    dp.paragraph_type,
    dp.level AS paragraph_level,
    dp.prefix,
    NULL::text AS text_with_highlights,
    NULL::text AS uncertainties,
    NULL::jsonb AS mandates,
    -- hyperlinks [{text,url},...] -> legacy [[label,url],...] link-pair shape.
    COALESCE(
        (
            SELECT json_agg(json_build_array(h->>'text', h->>'url'))
            FROM jsonb_array_elements(dp.hyperlinks) h
        ),
        '[]'::json
    ) AS links,
    dp.section,
    dp.annex_index,
    dp.text_index,
    false AS is_mandates
FROM digitallibrary.document_paragraphs dp
WHERE dp.lang = 'en'
    -- Drop document masthead boilerplate (symbol/date/distribution header block).
    AND NOT (dp.type = 'frontmatter' AND dp.subtype = 'masthead')
    -- Precedence: skip symbols already covered by the richer mandates arm.
    AND NOT EXISTS (
        SELECT 1
        FROM mandates.paragraphs mp
        WHERE upper(regexp_replace(mp.document_symbol, '[[:space:]]', '', 'g'))
              = dp.symbol_normalized
    );

grant select on public.unified_paragraphs to mandates_readonly;
