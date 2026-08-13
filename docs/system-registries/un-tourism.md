# UN Tourism — World Tourism Organization

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **E-Library GA Documents** (Session Documents) — <https://www.e-unwto.org/loi/unwtogad>
  — still the recorded flagship; also reachable as
  `e-unwto.org/journal/unwtogad`. Documents carry DOIs
  (`10.18111/unwtogad.…`). A parallel Executive Council series exists.
- **Governing-body session sites** (Session Documents) — <https://ga.untourism.int/>
  — **found in round 3.** A per-session microsite for the 26th General
  Assembly (Riyadh, 7–11 November 2025) carrying every working document as
  a PDF (A/26/1 … A/26/17, including the draft Programme of Work and Budget
  2026–2027 and the implementation report for 2024–2025), with tabs for
  Executive Council sessions EC124 and EC125 and the Committee on
  Statistics. `pb.untourism.int` serves a near-identical staging mirror of
  the same site.

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — chronological per-session compilations, GA series 1975–2025 plus the Executive Council series; supplemented by the per-session microsites |
| 2 mandates (active) | no — round 3 re-confirmed: purely chronological; no in-force/superseded distinction anywhere. The session microsite does not even post the adopted resolutions, only the working documents that preceded them |
| 3 budget-linked | no — the GA approves the programme of work and budget as documents (A/26/4(e) I and II); no system connects specific resolutions to financial data |
| 4 implementation-linked | no — nothing tracks implementation per resolution |
| 5 results-linked | no — the Secretariat reports on implementation of the **general** Programme of Work (A/26/4(b), "Implementation of the General Programme of Work for 2024-2025"), not against individual resolutions. Same pattern at Executive Council level (CE126/04) |
| 6 interoperability | deferred — DOIs on the e-library side are a real identifier, but the corpus is PDF |

## Related portals (not linked to mandates)

None. UN Tourism publishes no budget, results or transparency portal; the
budget appears only as a GA working document.

## Notes

- **Round 3 (2026-08-13) link check: both recorded URLs live but
  unfetchable.** `untourism.int` and `e-unwto.org` return HTTP 403 to
  WebFetch, to `curl` with a desktop Chrome user-agent, and to headless
  Chromium (`untourism.int` serves a Cloudflare "Performing security
  verification" interstitial). Existence and titles confirmed via search
  indexing: `untourism.int/structure` is live under the title "Governing
  Bodies", and `e-unwto.org/loi/unwtogad` is live. No evidence of a move or
  a rename. Round-1 browser verification of content still stands.
- **Governing bodies re-cut under the round-3 rule.** UN Tourism's own
  structure page lists four tiers:
  - **General Assembly** — keep. Members "approve the programme of work and
    budget for the Organization", and elect the Secretary-General.
  - **Executive Council** — keep. "UN Tourism's governing board, responsible
    for ensuring that the Organization carries out its work and adheres to
    its budget"; meets at least twice a year.
  - **Committees** — **remove.** Described by UN Tourism itself as
    "specialized committees of UN Tourism Members [that] **advise** on
    management and programme content" (Programme and Budget Committee;
    Statistics and TSA; Tourism and Competitiveness; Tourism and
    Sustainability; World Committee on Tourism Ethics; Review of
    Applications for Affiliate Membership). Advisory, so out.
  - **Regional Commissions** — **remove.** They meet at least annually and
    feed recommendations upward; they approve nothing of the Organization's
    own. Same call as FAO's Regional Conferences — see UNCERTAINTIES.
- GA26 outcomes for the record: Programme of Work and Budget 2026–2027
  approved, Secretary-General appointed for 2026–2029, Riyadh Declaration
  adopted, membership at 161 States from 1 January 2026.

## Open questions

- Whether the e-library GA series has been extended to the 26th session
  (2025) — not checkable behind the 403 without an interactive browser.
- Whether adopted GA26 resolutions are published anywhere outside the
  session report; point 6 unassessed.

_Last verified: 2026-08-13 (research round 3, re-verification)._
