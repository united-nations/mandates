# UNOPS — United Nations Office for Project Services

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **Executive Board Documents** (Document Repository) — <https://www.unops.org/about/governance/executive-board/executive-board-documents>

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — repository of "all UNOPS-related Annual Reports, document sessions, and Executive Board decisions, reports and statements from 1994-present", filterable by document type and year. Re-verified live 13 Aug 2026; the year filter now runs **1994–2026** and the document-type filter offers Annual reports to the EB / Documents for sessions / EB decisions / EB statements / Reports of the EB |
| 2 mandates (active) | no — a document archive only; no in-force/superseded status for decisions |
| 3 budget-linked | no — no financial amounts tied to specific decisions |
| 4 implementation-linked | no — no decision-tracking table for UNOPS. The joint-board tracking tables track only their own agency's requests: UNDP's covers "requests to UNDP", UNFPA's "specific and time-bound requests to UNFPA"; neither carries a UNOPS column. (UNOPS's separate oversight-recommendation monitoring tracks audit recommendations, not EB decisions.) |
| 5 results-linked | no — no outcome reporting against specific decisions |
| 6 interoperability | deferred (later round) |

## Round 3 verification

- Executive Board documents repository live, structure unchanged, filters
  intact, coverage extended to 2026.
- Executive Board governance page (<https://www.unops.org/about/governance/executive-board>)
  live: "The Executive Board provides intergovernmental oversight and
  guidance to the three organizations, ensuring alignment with the policy
  direction of the General Assembly …" and "the Board oversees and reviews
  UNOPS strategic direction, financial performance and oversight matters."
  36 rotating Member State representatives; UNOPS independent since 1995.
- No new decision-tracking system found. Score stays 1.

## Related portals (not linked to mandates)

- **UNOPS Data Portal** — <https://data.unops.org/> — IATI-based project and expenditure data with maps and infographics; UNOPS joined IATI in 2011 as the first UN body to publish in the format. Organized by project/country/sector/donor, not by Board decisions. **Round 3: rendered successfully for the first time** (previous rounds got only the page title from a client-rendered app) — the landing view is a clickable globe with clustered project locations, confirming the geographic/project organization and the absence of any decision dimension.

## Governing bodies — re-verified, removal CORRECT

Governing body is the shared **Executive Board of UNDP, UNFPA and UNOPS**
(GA res 48/162, 1993; 36 Member States, elected annually through ECOSOC
for three-year terms). Reuses the existing `undp-board` ref in
`un-system.json`.

The GA/ECOSOC removal is **unambiguously correct** here, and UNOPS is the
cleanest of the six cases:

- UNOPS is **fully self-financing** — it takes no assessed contributions
  and recovers its costs from management fees on the projects it delivers.
- It has **no UN programme-budget section**, so the General Assembly
  appropriates nothing for it (checked against
  `data/references/ppb_sections_and_entities.tsv`).
- ECOSOC's only role is *electing* Board members; the Board itself
  approves UNOPS's budget estimates and strategic plan.

Correspondingly, UNOPS carries no `this-site` Mandate Source Registry
entry — there are no programme-budget mandate citations to carry.

## Notes

- UNOPS decisions are adopted at the joint Board's UNOPS-segment items and
  numbered jointly (e.g. decision 2025/6 on liquid excess reserves;
  DP/OPS/… series). They are compiled in the annual joint compilation of
  decisions and on the UNOPS EB documents page, but no
  decision-tracking/implementation matrix exists for the UNOPS segment —
  unlike UNDP and UNFPA, which each publish their own (agency-specific)
  tracking tables.
- Round 2 (gap-fill) confirmed this via the UNFPA 2024 tracking table
  (26 pp, "requests to UNFPA"; UNOPS appears only inside joint "UNDP,
  UNFPA and UNOPS" decision references) and the UNOPS governance /
  EB-documents pages (no tracking tooling described). Round 3 found
  nothing new.

## Open questions

- Whether a UNOPS-segment decision-tracking table is published anywhere
  not surfaced by search (e.g. only inside session documents rather than
  as a standing web/PDF matrix). Unchanged.
- Point 6 interoperability (deferred to a later round).

_Last verified: 2026-08-13 (research round 3, re-verification)._
