# ITC — International Trade Centre

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

ITC is a joint subsidiary organ of the World Trade Organization (WTO) and
the United Nations (through UNCTAD) — the only fully joint UN/WTO agency,
which is why its governance runs through two parent tracks at once.

## Systems

- None scored. No decision-tracking system. ITC's annual **Joint Advisory
  Group (JAG)** is advisory: it meets annually, examines the Executive
  Director's Annual Report, and makes **recommendations** to the UNCTAD
  Trade and Development Board and the WTO Committee on Trade and
  Development on ITC's programme of work. There is no in-force/superseded
  register of those recommendations and no per-decision implementation or
  budget tracking.

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | no — arguably present: the governance pages publish per-session JAG materials (agenda, Annual Report, post-session JAG report/conclusions, list of participants) with a 2019–2025 session archive plus the current 2026 session, but this is a per-session document listing of advisory conclusions, not a compiled/searchable decision registry |
| 2 mandates (active) | no — no in-force/superseded status for JAG recommendations |
| 3 budget-linked | no — the Regular Budget is funded in equal parts by the UN and WTO and approved by the UN General Assembly and the WTO General Council; the Open Data Portal carries extra-budgetary (IATI) money by project; neither is linked to specific JAG recommendations |
| 4 implementation-linked | no — reporting is via the annual Executive Director report against the Strategic Plan and biannual CCITF reports against operational plans, not per JAG recommendation |
| 5 results-linked | no — results-based management dashboard and Independent Evaluation Unit report at strategic-plan / project level, not against specific decisions |
| 6 interoperability | deferred (later round) |

## Related portals (not linked to mandates)

- **ITC Open Data Portal (Beta)** — <https://open.intracen.org/> — IATI-based; extra-budgetary project data by recipient country/region, funder, sector, impact area and SDG. **Re-verified live 13 Aug 2026** and refreshed: data status now 31.12.2025, ~90% of XB funds; 2025 figures $120.37M budget / $119.57M expenses / 117 projects / 58 funders. Organized by project, not by JAG recommendations.
- ~~**ITC on the IATI Registry** — <https://www.iatiregistry.org/publisher/itc>~~ — **DEAD (round 3).** The whole IATI Registry has been retired: every `iatiregistry.org` path now returns 404 with the notice *"The IATI Registry has been replaced … For public information on reporting organisations and their IATI data files, please see the IATI Dashboard."* Successor: **IATI Dashboard** — <https://dashboard.iatistandard.org/publishers/itc/> (Cloudflare-gated to non-browser clients; existence corroborated by the migration notice and by search-indexed dashboard pages for publisher slug `itc`, IATI org ID `XM-DAC-45001`).

## Governing bodies — corrected in round 3

**The round-2 list (JAG only) was wrong.** The JAG is advisory by its own
description and adopts nothing; with the General Assembly removed, ITC was
left with no body that decides anything. Verified directly on ITC's own
governance page (<https://www.intracen.org/about-us/governance>,
rendered 13 Aug 2026):

> "ITC is a joint subsidiary organ of the World Trade Organization (WTO)
> and the United Nations through the United Nations Conference on Trade and
> Development (UNCTAD)."

> "ITC's Regular Budget (RB) is funded in equal parts by the UN and the
> WTO, and is approved by the UN General Assembly and the WTO General
> Council."

Corroborated on ITC's Proposed Programme Budget page
(<https://www.intracen.org/about-us/governance/corporate-documents/proposed-programme-budget>,
updated 16 July 2026): *"This document presents ITC's proposed 2027
programme budget to the UN General Assembly."* ITC has its own UN
programme-budget section (Section 13, `A/80/6 (Sect. 13)` for 2026),
confirmed against `data/references/ppb_sections_and_entities.tsv`.

Proposed list (in decreasing order of decision power):

1. **General Assembly** (`un-ga`) — approves the UN half of the Regular
   Budget through the Fifth Committee; ITC's proposed programme budget is
   submitted to it. **Restored.**
2. **WTO General Council** — approves the WTO half of the Regular Budget.
   <https://www.wto.org/english/thewto_e/gcounc_e/gcounc_e.htm> (verified
   live). **New — requires a new `bodies` entry; the dictionary currently
   has no WTO body at all.**
3. **Trade and Development Board (UNCTAD)** — the UN-side parent organ;
   receives JAG recommendations on ITC's programme of work.
   <https://unctad.org/about/trade-and-development-board>. **New.**
4. **WTO Committee on Trade and Development** — the WTO-side counterpart
   that receives the same JAG recommendations and reports onward to the
   General Council.
   <https://www.wto.org/english/tratop_e/devel_e/d3ctte_e.htm> (verified
   live; the older `d1comtd_e.htm` path 302s to the WTO 404 page). **New —
   include for symmetry with the TDB, or drop both and keep only 1+2+JAG
   if the list is to stay short.**
5. **Joint Advisory Group (JAG)** — advisory only, retained and labelled.
   <https://www.intracen.org/about-us/governance/the-joint-advisory-group-jag>.

## Notes

- Governance page re-verified 13 Aug 2026 (Cloudflare-gated; rendered in a
  headless browser). Parent bodies (UN via UNCTAD + WTO), JAG, CCITF
  (Consultative Committee of the ITC Trust Fund), Board of Auditors, JIU
  and OIOS oversight all still described. Corporate documents now offered
  as individual PDFs for **Strategic Plan 2026–2030** and **Operational
  Plan 2026** — a document set, not a system.
- JAG page re-verified 13 Aug 2026: the **60th session took place on
  2 July 2026** at the WTO in Geneva (hybrid). Related documents = agenda,
  Annual Reports, *2026 Annual Evaluation Synthesis Report and new
  Evaluation policy*, Strategic Plan 2026–30, JAG Reports (posted after
  the meeting), list of participants, speeches and presentations,
  statements by members and observers. "Previous JAG sessions" archive
  covers 2019–2025. Session videos dated 23 July 2026.
- The WTO's own coherence page (<https://www.wto.org/english/thewto_e/coher_e/wto_itc_e.htm>)
  states that "As a subsidiary agency of UNCTAD and the WTO, ITC is
  subject to the governing bodies of both," and that the Executive
  Director is appointed jointly by the WTO Director-General and the UNCTAD
  Secretary-General. It calls the JAG the body "which governs ITC's work"
  — looser wording than ITC's own, and not a basis for treating the JAG as
  a decision-making organ.
- ITC is subject to the UN Financial Regulations and Rules and audited by
  the UN Board of Auditors (unqualified opinions; IPSAS-compliant).

## Open questions

- Whether ITC ever compiles JAG recommendations into a cross-session,
  statused list (the raw material exists in the Annual Reports and JAG
  reports but is not assembled as a register). Unchanged in round 3.
- Whether the Open Data Portal (still Beta, XB-only) will extend to
  Regular Budget or link money to governing decisions.
- Whether the `bodies` dictionary should gain one WTO entry
  (General Council) or two (plus Committee on Trade and Development) — see
  the numbered list above.
- Point 6 interoperability (deferred to a later round); the Open Data
  Portal exposes an internal JSON API, and the IATI download now runs
  through the IATI Dashboard rather than the retired Registry.

_Last verified: 2026-08-13 (research round 3, re-verification)._
