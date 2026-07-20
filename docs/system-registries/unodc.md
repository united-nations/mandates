# UNODC — United Nations Office on Drugs and Crime

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

UNODC is a Secretariat office; its two governing bodies are functional
commissions of ECOSOC: the **Commission on Narcotic Drugs (CND)** and the
**Commission on Crime Prevention and Criminal Justice (CCPCJ)**. Later
adoption by ECOSOC and the General Assembly is common for their texts.

## Systems

- **Resolutions and Decisions Database (RDDB)** (Resolutions Database) — <https://www.unodc.org/rddb/en/index.html>

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — RDDB is a genuine queryable database (not a PDF list): full-text search plus facets for Topic (Crime / Drugs), Mandate Type (Resolution / Decision), Adopted By (CCPCJ / CND / ECOSOC / GA) and Year (1946–2026); 2,306 entries verified live |
| 2 mandates (active) | no — the "Mandate Type" facet distinguishes Resolution vs Decision, not active vs superseded/lapsed; no in-force/repealed status is recorded anywhere in the record (Year / Topic / Mandate Type / Session / Number / title) |
| 3 budget-linked | no — RDDB carries no financial fields; nothing links resolutions to UNODC's consolidated or thematic budgets |
| 4 implementation-linked | no — RDDB is a text repository with no follow-up/status column; implementation is reported through separate Secretary-General/Executive Director reports to CND/CCPCJ, not against specific resolutions in a system |
| 5 results-linked | no — the Independent Evaluation Section publishes evaluations by year/region/topic/programme, not against specific CND/CCPCJ resolutions or decisions |
| 6 interoperability | deferred (later round) |

## Related portals (not linked to mandates)

- **Database of UNODC Evaluation Reports** — <https://www.unodc.org/unodc/en/evaluation/reports.html> — browsable by year, region and topic (transnational organized crime, world drug problem, corruption, terrorism prevention, justice, etc.) and by country/regional programme; strategic/programme/project-level, not decision-linked. Verified live.
- **CND** and **CCPCJ** resolutions-by-decade index pages (e.g. <https://www.unodc.org/unodc/en/commissions/CND/Resolutions_Decisions/resolutions-and-decisions-2020-2029.html>) — HTML finding aids that duplicate/feed RDDB; same document-access layer, not a separate system.

## Notes

- RDDB is maintained by the **Secretariat to the Governing Bodies (SGB)**, Division for Treaty Affairs; contact `unodc-sgb@un.org` (Vienna International Centre). About page verified: <https://www.unodc.org/rddb/en/about-us.html>.
- It is the strongest pure-documents case among the gap-fill entities: an Angular single-page app over a faceted index, EN/AR/ZH/FR/RU/ES, covering CND + CCPCJ resolutions and decisions and their onward ECOSOC/GA adoptions. But it stops at document access — no lifecycle status, money, follow-up or outcomes. Score = 1.
- The build stamp on the RDDB pages reads "build 859 09/21/2018"; content (through GA res 80/227, CND 68th session, CCPCJ 34th, 2025) is current, so the database is maintained even if the front-end code is not.

## Open questions

- Whether RDDB exposes an API/bulk export (its `data.json?lng=en` backend suggests machine access) — relevant only to point 6 interoperability (deferred).
- Whether SGB anywhere marks superseded/consolidated resolutions (e.g. omnibus texts replacing prior ones); none surfaced in the record schema.

_Last verified: 2026-07-19 (gap-fill round)._
