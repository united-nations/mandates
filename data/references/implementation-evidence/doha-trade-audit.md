# Complete pairwise review: Doha and international trade

Reviewed 28 October 2026 against the seven-case sample's selected reports (not a claim to have discovered every later or separately mandated report).

| Resolution | Report | Source rows reviewed | Rows with exact linked passages | No matching report passage |
| --- | --- | ---: | ---: | ---: |
| A/RES/76/258 | A/80/426, 19 PDF pages | 453 | 64 | 389 |
| A/RES/60/184 | A/61/272, 19 PDF pages | 23 | 20 | 3 |

Doha coverage includes both main operative paragraphs, all 309 numbered annex provisions, and all 142 annex child/target rows from the registry. The latter include two structural subsection labels (`Transport`, `Energy`), recorded as such rather than treated as independent mandates. Child rows have exact registry positions in their locators because their prefixes repeat or are absent. Every source row has a matched/no-match review assessment. The 23 trade OPs are all covered.

## Reading and source fidelity

The complete report texts were reviewed: A/80/426 paragraphs 1–74, summary, headings, figures, four-option modality table, conclusions and recommendations; A/61/272 paragraphs 1–66, summary, both tariff tables and final recommendations. Every source resolution row, including all Doha child targets/lettered clauses, was read against those complete report scopes. Exact UI resolution wording comes from the independent registry snapshot represented in `review-manifest.json`; report text/page provenance comes from the stored full report sources and `report-corpus.json`. Quotations are normalized extracted text, not newly written paraphrases. Report excerpts are exact unique substrings, and their categories are assigned to the excerpt rather than inferred solely from the parent paragraph.

The Doha modality table on PDF page 14 compares four models, with trade-offs such as local relevance, institutional capacity, reach, sustainability and coordination. Report paragraphs 51 and 52 explicitly introduce the four models and identify the hybrid B/C recommendation. These already-linked passages carry the evidence and page link; the UI does not reconstruct the table's column relationships as a misleading linear quotation. Figures and tariff tables were checked as context; numbered prose supplies their relevant numerical interpretation. There are no separate annexes to either report requiring additional mandate entries.

## Decisions that matter

- A/80/426 is a targeted university-feasibility report, not an omnibus DPoA implementation report. Most trade, health, tax, climate, migration, graduation and governance provisions therefore have a reviewed no-match assessment. Absence in this report does not establish absence of action elsewhere.
- Preserved the original detailed annex 52 mappings; added the report's critical qualification that the proposed university is **not a degree-issuing institution**, alongside consultation activity and prospective institutional, funding, gender and connectivity measures. None of these are presented as an already operational university.
- Added closely specified links for existing remote-laboratory/e-learning activity, tertiary education constraints, scholarship financing, women's digital exclusion and connectivity indicators. Only the addressed source clause is highlighted; a link does not cover every request in a multi-part paragraph.
- Distinguish data measuring a target from context: population Internet-use/cost figures can inform a broad universal-connectivity target, but the coincident 35% overall Internet-use figure in 2024 does **not** prove the target for broadband user penetration by sex in 2025. That target's linkage is explicitly context only. The analogous 70% by-sex broadband target is also not scored as met.
- Doha annex 309's 2026 programme-wide midterm review is not fulfilled by A/80/426's recommendation to launch an online university in 2027. It remains no-match in this particular report.
- The trade report's suspension of Doha negotiations and missed deadlines are context/gaps, not completed implementation. Agreements on selected formulas, proposals and provisional transparency mechanisms are output-level results with their unresolved conditions retained.
- Projected gains from trade modelling are analysis, not observed welfare results. Report paragraphs 16 and 27 preserve that distinction.
- The public-health TRIPS excerpt retains the conditions for entry into force and the statement that no use had been made of the waiver.
- Trade OP 12 (trade/financial-system coherence plus specific UNCTAD policy/technical action), OP 11 (particular WTO-inconsistent unilateral actions) and OP 22 (Ghana hosting UNCTAD XII) have no substantive matching passage. Trade OP 21 has only a **prospective funding expectation** for the Integrated Framework; no received donor contributions or JITAP funding are inferred.

## Outputs

- `/tmp/implementation-complete/A_RES_76_258.json`
- `/tmp/implementation-complete/A_RES_60_184.json`

Both are complete case objects suitable for merging into the shared fixture. They retain the original report hashes and existing source strings and add `review` on every provision; `locator.position` disambiguates child rows. They do not change UI or commit files.
