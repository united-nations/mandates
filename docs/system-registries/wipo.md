# WIPO — World Intellectual Property Organization

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Governing bodies

Bodies that adopt WIPO's own mandates
(<https://www.wipo.int/en/web/assemblies>, re-verified 2026-08-13):

- **WIPO General Assembly** — WIPO's own supreme body, meeting in the annual
  Assemblies series (66th series, July 2025; 67th, 2026). The page states:
  "The main policy and decision making bodies of WIPO are the General
  Assembly and the Coordination Committee." Adopts decisions (published as
  the annual *List of Decisions*, e.g. `docs-en-a66-2025-list-decisions.pdf`)
  and, with the other assemblies, the Program of Work and Budget.
  Mandate-adopting: **yes**.
- **Coordination Committee** — advises the organs of the Unions, the General
  Assembly and the Director General, nominates the Director General, and
  adopts decisions on staff and administrative matters. Mandate-adopting:
  **yes**, in a narrower administrative sense.

**Context:** "Twenty-two Assemblies, and other bodies of the Member States
of WIPO and of the Unions administered by WIPO, meet annually" — the
Program of Work and Budget 2026/27 was approved in July 2025 by "the Member
States of WIPO" acting through the relevant assemblies, not by a single
body. **Excluded:** the **Program and Budget Committee**, whose
recommendations "are submitted to the General Assembly and other bodies of
the Member States of WIPO" — it recommends, it does not adopt. Also excluded:
the 19 standing committees and working groups listed on the meetings
browser, which negotiate texts and report upward.

## Systems

- **Meeting Documents** (Session Documents) — <https://www.wipo.int/meetings/en/topic_bodies.jsp>
  — live, HTTP 200, no redirect (re-verified 2026-08-13). "Browse by decision
  making and negotiating bodies", 19 bodies. A legacy `.jsp` path that has
  survived WIPO's migration to `/en/web/…`; the newer per-series assembly
  pages (e.g. `/en/web/assemblies/a66`) carry the same documents in a
  session-scoped layout.

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — annual per-series decision lists (PDF) plus a per-body meeting-documents browser |
| 2 mandates (active) | no — annual decision lists per body; no in-force/replaced distinction |
| 3 budget-linked | no — the Program of Work and Budget is structured by expected results and, from 2026/27, by 8 sectors (replacing 31 programs); never by Assemblies decisions |
| 4 implementation-linked | no — no per-decision status reporting found |
| 5 results-linked | no — the WIPO Performance Report reports annually against expected results, not against specific Assemblies decisions |
| 6 interoperability | deferred (later round) |

Total unchanged: **1**.

## Related portals (not linked to mandates)

- **Results, Budget and Performance** — <https://www.wipo.int/en/web/about-wipo/budget/index>
  — **URL corrected**: the previously recorded `/about-wipo/en/budget/`
  now 302-redirects here. Live, hub for the biennial Program of Work and
  Budget (2026/27: income ~CHF 945m, expenditure ~CHF 885m, approved July
  2025) and the annual WIPO Performance Report, archives back to 2004/2005,
  plus the RBM framework and a business-continuity dashboard (June 2026).

## Notes

- Mature results-based budgeting and reporting apparatus, anchored entirely
  in the expected-results framework, not in decisions.
- The 2026/27 budget shifted from 31 programs to 8 sectors — a structural
  change to the budget taxonomy that moves it *further* from decision-level
  granularity, not closer.
- No decisions database, no status marking, no cross-year search of decisions
  found in this round.

## Open questions

- Round 3+: interoperability (point 6).
- Whether `topic_bodies.jsp` survives the next site migration; if it goes,
  the registry link should move to `/en/web/assemblies`.

## Changes in this round

- Added a Governing bodies section; PBC and the 19 committees excluded as
  recommending/negotiating bodies.
- Corrected the related-portal URL to `/en/web/about-wipo/budget/index`.
- Confirmed the legacy `topic_bodies.jsp` registry link is still live.
- Score unchanged.

_Last verified: 2026-08-13 (research round 3, re-verification)._
