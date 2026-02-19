create table public.documents (
    symbol text not null primary key,
    record_number text,
    symbol_split jsonb,
    symbol_split_n integer,
    symbol_without_prefix text,
    symbol_without_prefix_split jsonb,
    symbol_without_prefix_split_n integer,
    session_or_year text,
    document_type text,
    issuing_body text,
    is_part boolean,
    uniform_title jsonb,
    proper_title text,
    title text,
    subtitle text,
    other_title text,
    normalized_title text,
    publication_date text,
    date text,
    date_year integer,
    note jsonb,
    corporate_name_level1 jsonb,
    corporate_name_level2 jsonb,
    conference_name jsonb,
    subject_terms jsonb,
    resource_type_level3 jsonb,
    agenda_document_symbol jsonb,
    agenda_item_number jsonb,
    agenda_item_title jsonb,
    agenda_subjects jsonb,
    related_resource_identifier jsonb
);
create unique index idx_document_symbol on public.documents (symbol);
create index idx_documents_title on public.documents using gin (to_tsvector('english'::regconfig, title));
CREATE INDEX IF NOT EXISTS idx_documents_date_year ON public.documents (date_year);
CREATE INDEX IF NOT EXISTS idx_documents_issuing_body ON public.documents (issuing_body);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON public.documents (document_type);
CREATE INDEX IF NOT EXISTS idx_documents_subject_terms ON public.documents USING gin (subject_terms);
-- Composite index for common filter + sort pattern (year range + pagination)
CREATE INDEX IF NOT EXISTS idx_documents_year_symbol ON public.documents (date_year, symbol);