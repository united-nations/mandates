# IOM — International Organization for Migration

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **Council Resolutions Database** (Resolutions Database) — <https://governingbodies.iom.int/council-resolutions>

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — re-verified round 3 in a browser (site returns HTTP 403 to non-browser clients). Real queryable table: search by **Resolution No.**, **Title** and **Category** (Any / Admin / Financial / Other / Observership / Membership), sortable by Number and Category, paginated, one PDF per resolution. Runs to resolution **1423, 116th session (2025)** |
| 2 mandates (active) | no — re-confirmed round 3; the category facet is a subject classification (Admin/Financial/Membership/Observership/Other), not an active-vs-replaced status |
| 3 budget-linked | no — the Programme and Budget is adopted by Council resolution (e.g. C-116/RES/1419, "Programme and Budget for 2026") and revised by SCPF resolutions, but the database links to the resolution PDF only; no system connects resolutions to amounts |
| 4 implementation-linked | no |
| 5 results-linked | no — financial reports and Director General reporting go to SCPF/Council as session documents; no reporting against specific resolutions |
| 6 interoperability | deferred (later round) |

## Related portals (not linked to mandates)

- SCPF (Standing Committee on Programmes and Finance) pages on the same governing-bodies site: reports (<https://governingbodies.iom.int/scpf-reports>) and the SCPF resolutions list.
- "Essential Documents" section (`/essential-documents`) and the site-wide search (`/search`).
- Programme and Budget and Financial Report documents per Council/SCPF session.

## Notes

- Round 3: `governingbodies.iom.int` still refuses non-browser fetches (HTTP 403); everything above was read from a rendered page, not from search snippets, so the round-2 caveat is retired.
- **Governing-body question raised in round 3:** only the **Council** is recorded. The **Standing Committee on Programmes and Finance (SCPF)** also adopts numbered resolutions in its own series, including revisions to the Programme and Budget (e.g. S/36/RES/40 revising the 2025 P&B). Under the "adopts the entity's own mandates (approves its programme/budget)" rule it arguably qualifies; under a "supreme organ only" reading it does not, since the Constitution vests budget approval in the Council and the SCPF reports to it. Left unchanged pending the explicit inclusion rule — see Uncertainties in the round-3 return.

## Open questions

- Round 6 interoperability. The resolutions table has query-string facets (`?field_number_value=&title=&field_category_target_id=`) and is trivially scrapable; no API or export button observed.

_Last verified: 2026-08-13 (research round 3, re-verification)._
