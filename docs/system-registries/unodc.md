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
| 1 documents | yes — RDDB is a genuine queryable database (not a PDF list): full-text search plus facets for Topic (Crime / Drugs), Mandate Type (Resolution / Decision), Adopted By (CCPCJ / CND / ECOSOC / GA) and Year; **2,306 entries re-verified live 13 Aug 2026** against the database's own JSON backend |
| 2 mandates (active) | no — re-confirmed. The "Mandate Type" facet has exactly two values, Resolution (1,557) and Decision (749); it does **not** mean active vs superseded. No in-force/repealed status exists anywhere in the record schema (`year`, `session`, `sessionItem`, `documentNumber`, `adoptedBy.body`, `title`, `mandateType`, `topic`, `content`) |
| 3 budget-linked | no — RDDB carries no financial fields; nothing links resolutions to UNODC's consolidated or thematic budgets |
| 4 implementation-linked | no — RDDB is a text repository with no follow-up/status column; implementation is reported through separate Secretary-General/Executive Director reports to CND/CCPCJ, not against specific resolutions in a system |
| 5 results-linked | no — the Independent Evaluation Section publishes evaluations by year/region/topic/programme, not against specific CND/CCPCJ resolutions or decisions |
| 6 interoperability | deferred (later round) — but see the API note below |

## Round 3 verification of the RDDB

The system **still exists and is still maintained**. Three specific checks:

- **Exists.** `https://www.unodc.org/rddb/en/index.html` returns HTTP 200
  and renders the Angular app, title "Resolutions and Decisions DB".
  *Caution for future rounds:* the fetch tooling reports **404** for every
  `www.unodc.org` path, including the site root. This is bot-blocking at
  the edge, **not** link rot — plain `curl` with a browser user-agent gets
  200 for the same URLs. Round 3 nearly recorded a false dead link here.
- **Facet semantics unchanged.** Pulled from the backing endpoint
  (`https://www.unodc.org/rddb/data.json?lng=en`): `found: 2306`; facets
  are Topic (Drugs 1,653 / Crime 652 / All 1), **Mandate Type (Resolution
  1,557 / Decision 749)**, Adopted By (ECOSOC 924, CND 920, GA 350,
  CCPCJ 128) and Year. Confirms Resolution-vs-Decision, not
  current-vs-replaced.
- **Still maintained, with a lag.** Coverage runs 1946–2025 in the data
  (the 1946–2026 range previously recorded came from the year *dropdown*,
  which the front-end generates up to the current calendar year; filtering
  to 2026 returns the unfiltered set, i.e. no 2026 records). Latest year
  populated is 2025 (25 entries), including 2025 ECOSOC resolutions. The
  count is identical to the July 2026 round, so **nothing was added
  between July and August 2026, and the 2026 CND/CCPCJ sessions are not
  yet loaded**. The front-end build stamp still reads "build 859
  09/21/2018" — old code, content maintained on roughly an annual cycle.

**Latent, unused capability.** The controller JS
(`/misc/rddb/rddb-controller.js`) carries filter code for paragraph-level
*obligation* fields — `obligation.frequency`, `obligation.obligationModel`,
`obligation.actionBy`, `obligation.startYear` ("For year") — and the page
template renders a facet block for them. **None of these facets is
returned by the live endpoint and no record carries obligation data**, so
they earn nothing today. If they were ever populated, RDDB would become a
per-paragraph obligation register with an addressee and a start year, which
would be a serious candidate for points 2 and 4. Worth re-checking each
round.

## Related portals (not linked to mandates)

- **Database of UNODC Evaluation Reports** — <https://www.unodc.org/unodc/en/evaluation/reports.html> — browsable by year, region and topic and by country/regional programme; strategic/programme/project-level, not decision-linked. Re-verified live (HTTP 200) 13 Aug 2026.
- **CND** and **CCPCJ** resolutions-by-decade index pages (e.g. <https://www.unodc.org/unodc/en/commissions/CND/Resolutions_Decisions/resolutions-and-decisions-2020-2029.html>) — HTML finding aids that duplicate/feed RDDB; same document-access layer, not a separate system. Live.

## Governing bodies — re-verified, unchanged

CND and CCPCJ are correctly described as UNODC's governing bodies, and the
budget claim is correct. From UNODC's own CND page
(<https://www.unodc.org/unodc/en/commissions/CND/index.html>, re-verified
13 Aug 2026):

> "In 1991, the General Assembly (GA) expanded the mandate of the CND to
> function as the governing body of UNODC."

> "The CND's agenda has two distinct segments: a normative segment for
> discharging treaty-based and normative functions; and an operational
> segment for exercising the role as the governing body of UNODC."

> "Towards the end of each year, the Commission meets at a reconvened
> session to consider budgetary and administrative matters as the governing
> body of the United Nations drug programme."

The standing open-ended intergovernmental working group "deals with
governance and financial matters, **the consolidated budget of UNODC**,
evaluation and oversight …". CND and CCPCJ adopted the budget resolution
on UNODC's consolidated budget for the biennium **2026–2027** at their
reconvened sessions in December 2025. The CCPCJ page mirrors the CND page
for the crime side.

**Caveat on the GA/ECOSOC removal (flagged, not overturned).** UNODC also
has its own UN programme-budget section ("International drug control, crime
and terrorism prevention and criminal justice"), so the General Assembly
appropriates the regular-budget share directly. And RDDB's own "Adopted By"
facet shows **ECOSOC (924) and the GA (350) adopting more UNODC-relevant
texts than CND (920) and CCPCJ (128)** — under a literal reading of "bodies
that adopt this entity's mandates", ECOSOC would rank first. The removal is
defensible on the *budget-approval* test (CND/CCPCJ approve the consolidated
budget, which is the larger, voluntarily-funded envelope) but not on a
mandate-adoption count. See UNCERTAINTIES in the round-3 report.

## Notes

- RDDB is maintained by the **Secretariat to the Governing Bodies (SGB)**,
  Division for Treaty Affairs; contact `unodc-sgb@un.org` (Vienna
  International Centre). About page <https://www.unodc.org/rddb/en/about-us.html>
  (200 via browser user-agent; blocked to the fetch tooling like the rest
  of the domain).
- It remains the strongest pure-documents case among the gap-fill
  entities: an Angular single-page app over a faceted index, EN/AR/ZH/FR/RU/ES,
  covering CND + CCPCJ resolutions and decisions and their onward
  ECOSOC/GA adoptions. But it stops at document access — no lifecycle
  status, money, follow-up or outcomes. Score = 1, unchanged.

## Open questions

- **Partly answered:** RDDB does expose a machine-readable endpoint —
  `https://www.unodc.org/rddb/data.json?lng=en` returns the full facet set
  and result records as JSON, and accepts a `c=` criteria parameter. It is
  an undocumented internal endpoint, not a published API, but it is a real
  bulk/query path. Relevant to point 6 (deferred).
- Whether SGB anywhere marks superseded/consolidated resolutions (e.g.
  omnibus texts replacing prior ones); still none in the record schema.
- Whether the dormant `obligation.*` fields are ever populated.
- Whether the 2026 CND (69th) and CCPCJ (35th) sessions get loaded, which
  would confirm the annual maintenance cycle.

_Last verified: 2026-08-13 (research round 3, re-verification)._
