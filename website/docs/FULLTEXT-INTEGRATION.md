# Fulltext integration contract

## Source and eligibility

The document detail uses English `digitallibrary.document_paragraphs`, joined
with a `document_files` row whose status is `parsed` and its `document_parses`
record. Failed or unfinished processing does not expose retained semantic rows.
The legacy `mandates.paragraphs` corpus and static recovery snapshots are not
fallback sources. Successful status establishes display eligibility, not a new
certification of source fidelity.

Document symbols are normalized consistently. Lettered references may display
an exact, unambiguous block from an eligible parent. Compound or unresolved
references never substitute the whole parent's text for the requested part.
Historical detail pages resolve only unambiguous documents in registry-visible
series.

## Presentation

The sidebar and standalone page share paragraph rendering and eligibility.
Missing fulltext says “Fulltext could not be extracted.” Operational causes and
repair instructions are not shown to website users. Search misses remain
separate: a failed search is not an extraction failure.

Recorded extraction issues produce the existing warning:
“This extracted fulltext may contain errors or omissions. Please check the
source document.” Informational issues and checks not performed because the
source was unavailable do not themselves assert an extraction defect.

The PDF button uses the direct English ODS endpoint with the encoded document
symbol. A source link is a reference, not evidence that extraction succeeded.
The sidebar uses the native scrollbar and removes the page's reserved scrollbar
gutter while open, restoring it on close.

Existing paragraph structure, deterministic action/assignee annotations,
footnotes, table handling and bracket-part boundaries remain unchanged.

## Metrics

Word counts come from live `digitallibrary.document_text_metrics` rows only.
Their `source_parsed_at` must exactly match `document_parses.parsed_at`, with
matching parser, text-profile and metric versions. A newer computation timestamp
alone does not establish freshness.

Similarity requires the complete-series immediate predecessor, valid ordering,
and matching current/predecessor content hashes. Missing or stale values remain
unavailable rather than being filled from static snapshots. The documents
repository owns extraction, metric computation and similarity processing;
Mandates reads their results.

## Retired recovery artefacts — 21 September 2026

The temporary retained-text manifest covered 20,520 documents. At cleanup all
20,520 had successful parses. The provisional metric cache covered 80 documents;
all 80 had live word counts, and all 65 cached scores had live replacements.
The archive-presence inventory served only the retired repair explanations.

The previous files, including their audit hashes and proofs, are preserved on
Codebox outside the active website at:
`/mnt/HC_Volume_106835947/agent-cache/mandates-ui-cleanup-20260921T223349Z`.
Its `manifest.json` records the SHA-256 and original Git status of all 31
uncommitted files preserved before cleanup. No database statuses were changed
for this cleanup.

## Verification contract

Before accepting removal of the fallback paths, compare complete covered sets,
not samples: paragraph output, word counts and similarity must have zero losses
or unexplained changes. Keep the quality-warning and paragraph-boundary tests.
Typecheck the shared route/component contracts and verify the generic empty
state, warning and PDF link against the existing local server.
