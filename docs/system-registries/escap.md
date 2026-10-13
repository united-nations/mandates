# ESCAP — Economic and Social Commission for Asia and the Pacific

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **ESCAP Resolutions** (Resolutions Database) — <https://www.unescap.org/resolutions>

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — a single web table of the complete series, stated on the page as "Number of ESCAP resolution(s) = 717", columns Date of Adoption / Session No. / Title / Document Symbol plus a hidden Keywords column carrying UNBIS-style subject terms; every symbol links to full text on `undocs.org`. Current to E/ESCAP/RES/82/6 (24 April 2026). A companion browse-by-body page exists at <https://www.unescap.org/official-documents> (dropdowns for Commission session and for Committee/other bodies) |
| 2 mandates (active) | no — nothing in the table or in the underlying records marks a resolution in force, superseded or lapsed; the keyword column is subject indexing, not status |
| 3 budget-linked | no — no financial field anywhere in the table, and the strategic framework/programme of work put to the Commission is structured by subprogramme |
| 4 implementation-linked | partial — an annual "Summary of progress made in the implementation of the resolutions of the Economic and Social Commission for Asia and the Pacific" (verified ESCAP/82/19, 17 December 2025) is organized resolution by resolution, restating "Requirements of the operative paragraphs" and then reporting progress against each. It is a session PDF, not part of the resolutions database, and covers only "the resolutions … on which the secretariat is required to report to the Commission at its eighty-second session" — weak-form linkage |
| 5 results-linked | no — the progress summary records secretariat action against operative paragraphs (already credited under point 4); no outcome reporting attaches to specific resolutions |
| 6 interoperability | deferred (later round) |

## Related portals (not linked to mandates)

None found beyond the universal UN portals.

## Notes

- **Dual nature.** ESCAP is "the main legislative organ of ESCAP" reporting
  to ECOSOC, and simultaneously a Secretariat entity under an Executive
  Secretary. **The Commission meets annually at the ministerial level** and
  its remit explicitly includes mandate-setting: "to decide on the
  recommendations of its subsidiary bodies and of the Executive Secretary, to
  review and endorse the proposed strategic framework and programme of work"
  (verified, <https://www.unescap.org/commission/about-the-commission>). The
  session has a senior officials segment and a ministerial segment.
- Latest sessions: 82nd, Baku, 20–24 April 2026; 81st, Astana, 21–25 April
  2025.
- The conference structure was itself set by resolution 78/2 — a useful
  illustration that ESCAP mandates its own machinery through the same
  resolution series that the database indexes.
- ESCAP has nine subsidiary committees (Macroeconomic Policy, Poverty
  Reduction and Inclusive Development; Trade and Investment; Transport;
  Environment and Development; ICT, Science, Technology and Innovation;
  Disaster Risk Reduction; Social Development; Statistics; Energy) plus the
  **Advisory Committee of Permanent Representatives**. Under the terms of
  reference these bodies *recommend* to the Commission, which then decides —
  so none is listed as a governing body; see Open questions.
- Resolution 82/6 records the withdrawal of the United States of America from
  membership and the consequent amendment of the Commission's terms of
  reference — worth flagging because it changes the entity's membership base
  in 2026.
- `www.unescap.org` is behind Cloudflare and rate-limits: the resolutions
  page and the About page rendered in a headless browser, while
  `unescap.org/events/commission82` returned a challenge on every attempt.
  ESCAP/82/19 was therefore read via `documents.un.org`.

## Open questions

- Whether ESCAP's sectoral committees should be listed. They adopt reports
  and recommendations at their own numbered sessions, but the Commission's
  own terms of reference frame them as recommendatory. Contrast UNECE, whose
  sectoral committees *approve* their subprogramme work programmes and are
  listed there — the same word ("committee") covers two different powers
  across the two commissions.
- Whether the resolutions table offers server-side query or export (the
  hidden keyword column suggests client-side filtering only). Relevant to
  point 6.
- Whether the annual progress summary covers the standing stock of
  resolutions or only those with an explicit reporting request; the 82/19
  summary language implies the latter, which limits how much of the mandate
  stock is ever revisited.

_Last verified: 2026-08-13 (research round 3)._
