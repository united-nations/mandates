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

Paragraph structure, table handling and bracket-part boundaries are preserved.
Annotation corrections and footnote presentation are described below.

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

## Annotation and footnote presentation (24 September 2026)

`src/lib/data/paragraphs.ts` reads scalar classifications and `note_ids` from
Digital Library. `src/lib/fulltext-annotations.ts` builds highlight spans from
`action_verb`, not `lead_verb`: the latter is a structural first-word guess and
can be “We” or a gerund subject. Inherited actions remain filterable but are not
highlighted. Operative gerunds and bare “We will/shall” annotations are omitted;
preambular participles remain eligible. The reader removes selected contextual
qualifiers from assignees and rejects abstract-object heads (cooperation,
efforts, contribution, engagement, implementation, participation, support).
These are conservative reader corrections, not a database reparse.

The upstream parser lives in the sibling `documents.unfck.org` repository:

- `data-pipeline/pipeline/resolutions/sources/fulltext_extract_raw.py`: source
  paragraphs and Word footnote references.
- `data-pipeline/pipeline/resolutions/parsing/fulltext_parse.py`: semantic
  structure, first-word `lead_verb` heuristic, note rows, chapeau inheritance.
- `data-pipeline/pipeline/resolutions/parsing/fulltext_verbs.py`: hardcoded
  `LEXICON`, modifier lists, `ADDRESSEE_RULES`, `_ARTICLE_PREFIXES`, surface
  matching and `_extract_assignee`. The latter takes the text before “to”;
  class assignment uses substring keywords. It is not general-purpose NER.

`src/lib/fulltext-footnotes.ts` associates notes with paragraphs using explicit
source IDs, including repeated references. The reading view shows their full
text below the referencing paragraph and searches that text. Notes without a
supported reference remain visible instead of being discarded. IDs establish
paragraph ownership. `note_references` stores `{note_id, offset}` boundaries in
UTF-16 units, recovered from the archived Word source and aligned with the
semantic paragraph. The renderer inserts clickable superscripts at those
boundaries, preserves annotation/search spans, splits external links around
markers to avoid nested anchors, and gives each note a return link. Component
instance IDs prevent collisions between the standalone view and sidebar.

The documents repository owns migration `009_inline_footnote_references.sql`,
raw-v4 / sem-v6 extraction, and the source-verified
`pipeline/maintenance/fulltext_note_positions.py` backfill. Apply the additive
migration before deploying the reader. The backfill changes annotation metadata
only: text, paragraph IDs, parse timestamps and metric generations stay intact.
Missing, ambiguous or changed source text produces no guessed inline marker;
its existing paragraph-level note remains available below the paragraph.

TOC labels use one-line CSS ellipsis with the complete title available on hover.
Paragraph numbers use variable-width rectangular badges with tabular digits.
