# UNICEF — United Nations Children's Fund

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **Decision Monitoring Tables** (Decision Tracking) — <https://www.unicef.org/executiveboard/documents/decision-monitoring-tables>

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes |
| 2 mandates (current vs replaced) | no — monitoring tables mark each request green "completed" / yellow "in progress or partially completed", with non-action paragraphs greyed "no action required"; per-request status only, no current-vs-replaced registry |
| 3 budget-linked | no — matrices track time-bound requests with status; no financial fields identified (see open question) |
| 4 implementation-linked | yes |
| 5 results-linked | no — tables record implementation actions and status, not outcomes |
| 6 interoperability | deferred (later round) |

## Related portals (not linked to mandates)

- **UNICEF Transparency Portal** — <https://open.unicef.org> — **now verified live in a browser session** (round 2 could only confirm existence through the search index). Sections: Financial Overview, Explore our data, Supplies, Our Results Model, Documents and Resources, Glossary and FAQs; country profiles for 130 countries and 7 regions, incoming and outgoing funds, hosted funds; stamped "Data Last Updated: August 2026"; IATI publisher since 2012. Organized by country, fund and thematic area, not by Board decisions.

## Notes

- Round 3 opened the page in a headless browser (unicef.org returns 403 to every non-interactive client). Ten tables are published, **2017–2026**.
- **The most systematically refreshed set in this batch**: the 2018–2026 files all carry the filename stamp `2026-06-12`, i.e. every table back to 2018 was re-issued on the same day in June 2026. 2017 was last re-issued 2019-06-03.
- Page description verified verbatim: "These matrices keep track of the implementation of specific and time-bound requests contained in Executive Board decisions. The matrix is revised on a regular basis to keep the information relevant and up to date."
- **Round 2's open question is still open.** The media PDFs remain 403 to every client tried this round — curl with browser UA, WebFetch, Playwright request API, and Playwright top-level navigation with a warmed cookie jar. `budget = false` therefore still rests on the page's own description plus the two sibling systems (UNDP 2025 and UNFPA 2026) that were extracted in full this round and contain no financial fields at all.
- Decisions compendium at <https://www.unicef.org/executiveboard/decisions>.

## Governing bodies

- **Executive Board** — the sole governing body; endorsed the UNICEF Strategic Plan 2026–2029 at its second regular session 2025 and approves the integrated budget.
- **General Assembly / ECOSOC — the round-2 removal is correct.** UNICEF has no UN regular-budget section (absent from the PPB 2027 entity list) and is wholly voluntarily funded. The GA created it (res 57 (I)) and sets system-wide policy through the QCPR, which is what the `note` records. (ECOSOC elects the Board's members but adopts no UNICEF programme mandates.)

## Open questions

- Confirm in an interactive session that the monitoring tables have no financial columns — blocked by 403 in both round 2 and round 3.
- Point 6 interoperability (deferred to a later round).

_Last verified: 2026-08-13 (research round 3, re-verification)._
