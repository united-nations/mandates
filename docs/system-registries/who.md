# WHO — World Health Organization

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Governing bodies

Bodies that adopt WHO's own mandates:

- **World Health Assembly** — <https://www.who.int/about/governance/world-health-assembly>
  — annual, all Member States. Functions verified 2026-08-13: "determine the
  policies of the Organization, appoint the Director-General, supervise
  financial policies, and **review and approve the proposed programme
  budget**". Mandate-adopting: **yes** (resolutions and decisions).
- **Executive Board** — <https://www.who.int/about/governance/executive-board>
  — 34 technically qualified members, three-year terms; gives effect to the
  decisions and policies of the Health Assembly, sets its agenda and the
  resolutions to be considered, and adopts its own decisions and resolutions.
  Mandate-adopting: **yes**.

**Borderline, not listed:** WHO's own governance page names **six Regional
Committees** alongside the Assembly and the Board, and the Resolutions
Portal indexes their resolutions as a third governing-body class. They adopt
resolutions addressed to their Regional Director and regional office — i.e.
to WHO. Flagged for the inclusion rule rather than added (see the survey's
uncertainty list).

## Systems

- **Resolutions Portal** (Resolutions Database) — <https://resolutionsportal.who.int/>
  — live, re-verified 2026-08-13. Page title "Resolutions and decisions of
  the governing bodies"; the site is built on **AKN4UN** (its own
  `og:site_name`). Three tabs — Executive Board, World Health Assembly,
  Regional Committees — with per-session cards showing resolution and
  decision counts, six UN languages, categories/subcategories, entity and
  country facets, action terms, author, reference number and SDG alignment,
  plus an advanced search with same-paragraph proximity operators
  (action + position + entity).

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — EB101–EB159 and WHA51–WHA79 (1998–2026), plus regional committees; but see the currency gap in Notes |
| 2 mandates (active) | no — re-verified 2026-08-13: no in-force/superseded/active status field anywhere in the portal; it is a chronological archive with rich topical metadata |
| 3 budget-linked | partial — unchanged. WHO costs specific resolutions/decisions in its programme budget: the 2024–25 "List of resolutions and decisions" page (29 resolutions + 23 decisions approved 2017–2022, total US$ 1.75bn base segment) with a PDF explainer; for 2026–27 the mandate cost is stated as "at least US$ 2.3 billion" in the PPB document. **Not a system, and now demonstrably not per-item** (see Notes) |
| 4 implementation-linked | no — no per-decision implementation status is published; the AKN4UN mandate-tracking tool (EB154/33 para 26) remains internal agenda management |
| 5 results-linked | partial — consolidated WHA "Progress reports" documents (e.g. A78/34) report progress against specific named resolutions each Assembly; a document series covering only resolutions that requested periodic reporting, not a tracking system |
| 6 interoperability | deferred (later round) |

Total unchanged: **2** (documents, partial budget, partial results).

## Related portals (not linked to mandates)

- **open.who.int** — Programme Budget Web Portal: quarterly-updated budget,
  financing, contributor and implementation data organized by the GPW
  results hierarchy (outcomes/outputs), not by resolutions. Live; the site
  is a JS app that returns only chrome to non-browser clients.
- **Programme Budget Digital Platform** —
  <https://www.who.int/about/accountability/budget/programme-budget-digital-platform-2026-2027>
  (and the 2024–2025 edition): Executive Summary / Outcomes / Outputs /
  Dashboards / Explainers.

## Notes

- **Open question from round 2 answered.** The 2024–25 explainer PDF
  (`pb24-25_-explainer_resolutions_list.pdf`) was downloaded and read in full
  on 2026-08-13. It lists the 29 resolutions and 23 decisions by governing
  body, year, document symbol and title — **with no amount against any
  individual item**. The only figure is the aggregate US$ 1.75bn; per-item
  costings sit behind Table 1 / Figure 9 of the PB document and are not
  published. `partial` is confirmed, and is if anything generous.
- **The 2026–27 costing explainer has not been published.** The 2026–27
  Explainers page currently lists two explainers (impact measurement
  indicators; indicative staffing and budget breakdown) and six marked
  "Coming Soon"; there is no 2026–27 equivalent of the
  `list-of-resolutions-and-decisions` page. The ≥US$2.3bn mandate figure
  appears only in the PPB document / executive summary.
- **Currency gap in the Resolutions Portal (new finding).** Session cards
  exist for WHA79 (18–23 May 2026), EB158 (2–7 February 2026) and EB159
  (25–26 May 2026), but each shows "0 resolutions – 0 decisions". The latest
  populated sessions are WHA78 (28 resolutions, 27 decisions) and EB157
  (3 resolutions, 11 decisions), both May 2025 — i.e. the portal is roughly
  a year behind the governing bodies.
- Public reform-specific trackers exist (SIP actions, consolidated-platform
  recommendations) — scoped to governance reform, not all resolutions.

## Open questions

- Whether A78/34-style progress reports should count under point 4
  (implementation) instead of point 5 (results) — still unresolved.
- Whether the 2026–27 resolutions-costing explainer appears later in the
  biennium; if it ever carried per-resolution amounts on the portal itself,
  the budget point would strengthen.
- Point 6 (interoperability) unassessed; the portal has an advanced-search
  UI but no documented API or export.

## Changes in this round

- Added a Governing bodies section; regional committees flagged, not added.
- Identified the portal as an AKN4UN application and recorded its coverage
  (EB101–EB159, WHA51–WHA79) and the ~1-year content lag.
- Read the costing explainer end to end: no per-resolution amounts —
  answers the round-2 open question; `budget: partial` confirmed.
- Noted that no 2026–27 costing explainer exists yet.

_Last verified: 2026-08-13 (research round 3, re-verification)._
