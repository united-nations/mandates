# WTO — World Trade Organization

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **Documents Online** (Documents Database) — <https://docs.wto.org/dol2fe/Pages/FE_Search/FE_S_S001.aspx>

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — re-verified round 3; **310,697 documents published (WTO and GATT)**, updated daily, EN/FR/ES. Facets: symbol, date ranges (document / derestriction / posting), title, full text, bodies issuing, bodies mentioned, countries/territories, organizations, subject, products, articles, document type, restriction status, HS/services/environmental/ICS classifications. Boolean and proximity operators |
| 2 mandates (active) | no — re-confirmed round 3; Documents Online is a document archive. Its only status field is **document restriction status** (public / restricted / derestricted), which is a circulation category, not an in-force/replaced flag for decisions |
| 3 budget-linked | no — the budget page publishes org-wide consolidated budgets and member contributions with no link to the approving decisions (<https://www.wto.org/english/thewto_e/secre_e/budget_e.htm>, HTTP 200 round 3) |
| 4 implementation-linked | no |
| 5 results-linked | no — the Budget/Finance gateway catalogues oversight and performance reports but nothing reports outcomes against specific General Council/Ministerial decisions (<https://docs.wto.org/gtd/Default.aspx?langue=e&pagename=Budget_4>) |
| 6 interoperability | deferred (later round) |

## Related portals (not linked to mandates)

- WTO budget page (consolidated budgets + member contributions) — <https://www.wto.org/english/thewto_e/secre_e/budget_e.htm> (HTTP 200).
- Budget, Finance and Administration thematic gateway into Documents Online (CBFA reports, audit letters, outstanding-contributions statements) — <https://docs.wto.org/gtd/Default.aspx?langue=e&pagename=Budget_4> (HTTP 200).

## Notes

- Round 3 link check: all four recorded URLs plus the Ministerial Conference and General Council pages return HTTP 200. Nothing has rotted since round 2.
- Round 3 contact: <https://www.wto.org/english/info_e/cont_e.htm> is live and lists general enquiries "+41 (0)22 739 51 11" / `enquiries@wto.org`, media `press@wto.org`, publications `publications@wto.org`, and the postal address "Centre William Rappard, Rue de Lausanne 154, Case postale, 1211 Genève 2, Switzerland". **No separate General Council / Ministerial Conference secretariat contact is published**, so the general contact page remains the right entry.
- Documents Online has a Download button (PDF/Word, multi-part) but no public API or programmatic bulk export.

## Open questions

- Round 6 interoperability (rich facets, download but no API — likely a mid-range score).

_Last verified: 2026-08-13 (research round 3, re-verification)._
