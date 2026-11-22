# Implementation evidence sample review

The seven sampled resolutions are reviewed against the **complete sampled report** for each resolution. This is a fixed research sample, not a live search for newer reports.

The review covers every numbered operative paragraph and every numbered annex provision, together with the annex's subordinate bullet and lettered provisions: 783 source records in total. Preambular paragraphs and document boilerplate are outside this operative review. The seven reports contain 134 PDF pages and 532 numbered report paragraphs; the complete extracted texts, including summaries, tables and unnumbered material, are retained in `report-corpus.json`.

| Resolution | Report | Source records checked | With report passages | No matching passage |
| --- | --- | ---: | ---: | ---: |
| A/RES/76/258 | A/80/426 | 453 | 64 | 389 |
| A/RES/80/129 | A/81/336 | 15 | 10 | 5 |
| A/RES/80/137 | A/81/307 | 84 | 67 | 17 |
| A/RES/60/184 | A/61/272 | 23 | 20 | 3 |
| A/RES/69/313 | E/2025/8 | 141 | 49 | 92 |
| S/RES/2220(2015) | S/2025/670 | 33 | 24 | 9 |
| S/RES/2349(2017) | S/2026/445 | 34 | 15 | 19 |
| **Total** | | **783** | **249** | **534** |

The source records include two Doha subsection labels retained for completeness and marked as structural rather than independent mandates. A link can be contextual or prospective; these counts do not measure mandate completion.

`review-manifest.json` records every source provision's identity and text SHA-256, independently of the UI crosswalk. Numbered provisions use section, annex and prefix; subordinate provisions also use their registry position to disambiguate repeated letters and unnumbered bullets. The manifest records each report PDF's SHA-256 and page count. These are the English sources downloaded for the original sample.

The UI crosswalk remains in `website/src/data/implementation-evidence-pilot.json`. Every reviewed provision has a decision and rationale. A `no-match` decision means no sufficiently specific passage was identified in this sampled report; it does not establish non-implementation. A `matched` decision may represent context, analysis, reported activity, reported results, reporting itself or proposed next steps. The excerpt classifications distinguish those categories. Results are reports' own output or indicator claims.

Mappings use exact source clauses and exact report excerpts. Report paragraphs remain available in full, with PDF-page links. Multiple source clauses may refer to the same report paragraph; their excerpts and classifications can differ. Omission markers are generated from source offsets, so merged and overlapping excerpts retain source order. Qualifications needed to interpret reported progress are retained.

Each excerpt has its own starting PDF page and, where necessary, ending page. `pageSpans` in the corpus map character offsets in each normalized paragraph back to the physical PDF page. The info popup links to all pages containing the selected excerpts, rather than assuming that every sentence is on the paragraph's first page. Regenerate those locators with `python3 data/references/implementation-evidence/locate-excerpts.py` from the repository root.

The archived parsed report paragraphs preserve the extraction used by the UI, including extraction artifacts. They support exact-text and PDF-page validation; the linked PDFs remain authoritative for tables, footnotes and layout. In particular, the Doha modality table is read alongside its explanatory prose rather than reconstructed as a table in the excerpt cards.

The coverage tests in `website/src/lib/implementation-evidence-coverage.test.ts` check that every manifest provision has a decision, every quoted source text has the expected hash, and every linked report paragraph and PDF page match the archived corpus. The excerpt tests additionally validate exact, unique report spans and classifications.

Individual review notes are in the adjacent audit files.
