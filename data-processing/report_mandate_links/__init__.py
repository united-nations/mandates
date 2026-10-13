"""
report_mandate_links — Stage 1 of the SG-reports-to-mandates linkage.

Extracts report -> mandating-resolution links from UN Digital Library `notes[]`
prose (the report->resolution direction of evidence), producing the lossless
link rows that the resolution pages on mandates.un.org invert at display time.

NAMING. Named for what the pipeline produces (report->mandate link rows), not
for its input source. `sgreports_processing` was considered for parallelism
with `ppb_processing` and rejected because that name states the input and not
the output.

TRACE. Feature branch: `feature/sgreports-link`. Governing references
(maintained separately): rules_reports-to-mandates-extraction.md — the method;
reference_symbol-grammars-and-join-keys.md — the symbol layer.

Stage-letter module convention (as in `ppb_processing/`): modules are ordered
by leading letter. `a_extract.py` is the Stage 1 extractor.
"""
