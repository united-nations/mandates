-- =============================================================================
-- mandates schema
-- Stores structured paragraph-level content extracted from UN documents and
-- the normalised mandate objects derived from each paragraph.
--
-- Source JSON files: data/fulltexts/paragraphs/<sanitized_symbol>.json
-- Loader:           src/fulltexts/fulltexts_to_db.py
--
-- Re-runnable: the schema is dropped and recreated from scratch each run.
--
-- UUID strategy
--   paragraphs.id          uuid5(NAMESPACE_URL, "<symbol>:<position>")
--                          — deterministic; reconstructable from the natural key
--   paragraph_mandates.id  uuid4() generated app-side
--                          — random; UNIQUE (paragraph_id, mandate_index) is the
--                            stable natural key
--   all child table ids    gen_random_uuid() via DEFAULT
-- =============================================================================
DROP SCHEMA IF EXISTS mandates CASCADE;
CREATE SCHEMA mandates;
-- ===========================================================================
-- paragraphs
-- One row per paragraph object in the source JSON array.
-- Not all ppb2026.source_documents have a fulltext JSON; rows only exist when
-- a fulltext was successfully extracted.
-- ===========================================================================
CREATE TABLE mandates.paragraphs (
    -- Deterministic UUID: uuid5(URL_NAMESPACE, "<document_symbol>:<position>")
    -- Reconstructable from the natural key without a DB lookup.
    -- Do NOT use gen_random_uuid() here.
    id UUID PRIMARY KEY,
    document_symbol TEXT NOT NULL REFERENCES ppb2026.source_documents (ppb_full_document_symbol) ON DELETE CASCADE,
    -- 0-based position within the document array.
    -- Use the UUID for stable external/NLP references; positions may shift
    -- if the extraction pipeline is re-run with different chunking logic.
    position INTEGER NOT NULL,
    -- core content
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    -- structural classification
    heading_level SMALLINT,
    paragraph_type TEXT,
    paragraph_level SMALLINT,
    -- displayed prefix, e.g. '1.', '(a)', '(i)'
    prefix TEXT,
    -- NLP enrichment (populated by pipeline, may be NULL)
    text_with_highlights TEXT,
    uncertainties TEXT,
    -- Raw mandate extraction output kept as JSONB source-of-truth.
    -- Normalised into paragraph_mandates + child tables for querying.
    mandates JSONB,
    UNIQUE (document_symbol, position)
);
CREATE INDEX idx_paragraphs_symbol ON mandates.paragraphs (document_symbol);
CREATE INDEX idx_paragraphs_type ON mandates.paragraphs (type);
-- ===========================================================================
-- paragraph_links
-- Normalises the `links` array from each paragraph object.
-- Each element is a [document_symbol, url] pair referencing another document.
-- ===========================================================================
CREATE TABLE mandates.paragraph_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paragraph_id UUID NOT NULL REFERENCES mandates.paragraphs (id) ON DELETE CASCADE,
    -- Raw symbol as it appears in the source text, e.g. 'A/79/L.2', '46/182'
    linked_symbol TEXT NOT NULL,
    linked_url TEXT
);
CREATE INDEX idx_paragraph_links_paragraph_id ON mandates.paragraph_links (paragraph_id);
CREATE INDEX idx_paragraph_links_symbol ON mandates.paragraph_links (linked_symbol);
-- ===========================================================================
-- paragraph_mandates
-- One row per mandate extracted from a paragraph (one per element in
-- the mandates JSONB array).  mandate_index preserves ordering.
-- ===========================================================================
CREATE TABLE mandates.paragraph_mandates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paragraph_id UUID NOT NULL REFERENCES mandates.paragraphs (id) ON DELETE CASCADE,
    -- 0-based index within the paragraph's mandates array
    mandate_index SMALLINT NOT NULL,
    action_verb TEXT,
    action_verb_normalized TEXT,
    action_verb_type TEXT,
    UNIQUE (paragraph_id, mandate_index)
);
CREATE INDEX idx_paragraph_mandates_paragraph_id ON mandates.paragraph_mandates (paragraph_id);
CREATE INDEX idx_paragraph_mandates_action_verb_type ON mandates.paragraph_mandates (action_verb_type);
CREATE INDEX idx_paragraph_mandates_action_verb_norm ON mandates.paragraph_mandates (action_verb_normalized);
-- ===========================================================================
-- mandate_assignees
-- Who the mandate is directed at.
-- ===========================================================================
CREATE TABLE mandates.mandate_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mandate_id UUID NOT NULL REFERENCES mandates.paragraph_mandates (id) ON DELETE CASCADE,
    assignee TEXT,
    assignee_normalized TEXT,
    assignee_type TEXT
);
CREATE INDEX idx_mandate_assignees_mandate_id ON mandates.mandate_assignees (mandate_id);
CREATE INDEX idx_mandate_assignees_normalized ON mandates.mandate_assignees (assignee_normalized);
CREATE INDEX idx_mandate_assignees_type ON mandates.mandate_assignees (assignee_type);
-- ===========================================================================
-- mandate_deliverables
-- What the mandate asks to produce or accomplish.
-- ===========================================================================
CREATE TABLE mandates.mandate_deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mandate_id UUID NOT NULL REFERENCES mandates.paragraph_mandates (id) ON DELETE CASCADE,
    deliverable TEXT,
    deliverable_normalized TEXT,
    deliverable_type TEXT
);
CREATE INDEX idx_mandate_deliverables_mandate_id ON mandates.mandate_deliverables (mandate_id);
CREATE INDEX idx_mandate_deliverables_type ON mandates.mandate_deliverables (deliverable_type);
-- ===========================================================================
-- mandate_entities
-- Entities mentioned in the mandate (not necessarily the assignee).
-- ===========================================================================
CREATE TABLE mandates.mandate_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mandate_id UUID NOT NULL REFERENCES mandates.paragraph_mandates (id) ON DELETE CASCADE,
    mentioned_entity TEXT,
    mentioned_entity_normalized TEXT,
    mentioned_entity_type TEXT
);
CREATE INDEX idx_mandate_entities_mandate_id ON mandates.mandate_entities (mandate_id);
CREATE INDEX idx_mandate_entities_normalized ON mandates.mandate_entities (mentioned_entity_normalized);
CREATE INDEX idx_mandate_entities_type ON mandates.mandate_entities (mentioned_entity_type);