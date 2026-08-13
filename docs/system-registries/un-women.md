# UN Women — United Nations Entity for Gender Equality and the Empowerment of Women

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **Decision Monitoring Matrix** (Decision Tracking) — <https://www.unwomen.org/en/executive-board/decisions>

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — annual compendiums of Executive Board decisions, full text, 2010–2025, each linked to undocs.org (2025 = UNW/2025/11). Re-verified live 13 Aug 2026 |
| 2 mandates (active) | no — the matrix sorts requests across sheets (Time-Bound / Ongoing / Completed / Non-Requests) by request lifecycle, per paragraph; this is per-request status, not an active-vs-superseded registry of decisions (borderline — the sheet split is more explicit than UNDP's, but decisions are never marked superseded) |
| 3 budget-linked | no — no monetary amounts tied to decisions; "SPRED (Budget)" appears only as a responsible division |
| 4 implementation-linked | yes — the Decision Monitoring Matrix tracks implementation of "specific and time-bound requests contained in Executive Board decisions" per paragraph: columns ExB Decision / Paragraph / Request (verb) / Deadline / Responsible Division / Progress and follow-up action / Notes, with dated progress entries |
| 5 results-linked | no — the Progress and follow-up action column records actions taken (noted / in progress / implemented), not outcomes; results reporting is Strategic-Plan-based |
| 6 interoperability | deferred (later round) |

## Round 3 verification

- **Decisions page live and unchanged in structure.** Annual compendiums
  now run 2010–2025; the 2026 compendium is not yet due.
- **The matrix has not been refreshed.** The page still offers "The matrix
  monitoring the implementation of the Executive Board decisions **(updated
  21 August 2025)**" — the same file recorded in the July 2026 round, now
  approaching twelve months old and covering nothing from the 2026
  sessions. Round 2 read it as a per-session artifact (the file downloaded
  then was the Second Regular Session 2025 workbook). If the cadence has
  in fact lapsed rather than merely slipped, `implementation = true`
  becomes shakier; it is retained for this round because the system exists
  and its content is real, but the staleness is now on record and should
  be the first thing checked next round.
- No new registry-like system found for UN Women since July 2026.

## Related portals (not linked to mandates)

- **UN Women Data Hub / Data Portal** — <https://data.unwomen.org/data-portal> — re-verified live 13 Aug 2026. Gender statistics organized by SDG indicators, thematic areas (violence against women and girls, women peace and security, marriage/children/work), an Arab States regional set (190+ indicators, 17 territories, 2000–2022) and country fact sheets; no reference anywhere to Executive Board decisions.

## Governing bodies — re-verified, unchanged (with a caveat)

The **Executive Board** is correctly the governing body. UN Women's own
Executive Board page states it was established by **General Assembly
resolution 64/289** as "the Governing Body of the Entity to provide
intergovernmental support to and supervision of its operational
activities". 41 members: 10 African, 10 Asian, 4 Eastern European, 6 Latin
American and Caribbean, 5 Western European and Other, 6 top contributing
countries. The Board approves the Strategic Plan and the **Integrated
Budget** (e.g. UNW/2023/6/Rev.1 for 2024–2025), which is UN Women's own
programme-and-budget instrument. Removal of the GA/ECOSOC as *governing*
bodies is therefore **correct**.

**Caveat.** UN Women is one of the five entities in this batch that also
has its own UN programme-budget section ("UN-Women"), so the General
Assembly does appropriate a regular-budget share — the normative and
UN-system-coordination side — on top of the Board-approved Integrated
Budget. That share is the minority of UN Women's money, which is why the
removal stands; but it means the GA is not *purely* constitutive here
either. It also produces a visible oddity on the page: UN Women carries a
`this-site` Mandate Source Registry entry whose contents are, by
construction, GA and ECOSOC mandates cited in the programme budget, while
the governing-body column shows no GA. Noted for the inclusion rule.

## Notes

- Structurally the closest sibling to UNDP/UNFPA (documents +
  implementation, score 2): a per-request implementation-tracking matrix
  over compiled decisions, with no monetary linkage and no
  active-vs-superseded decision registry. The matrix is a downloadable
  Excel workbook (5 sheets) rather than a queryable web system.
- Round 2 (gap-fill) verified matrix content directly by downloading the
  Second Regular Session 2025 workbook
  (`executive_board_decision_monitoring_matrix_srs_2025`) and inspecting
  all sheet headers and entries. Round 3 re-checked the hosting page only;
  the offered file is still the 21 August 2025 version.
- Executive Board documents page (<https://www.unwomen.org/en/executive-board/documents>)
  live; sessions listed 2010–2025, with 2025 covering First Regular
  (10–11 Feb), Joint Meeting (30 May), Annual (17–19 June) and Second
  Regular (9–10 Sept). Official session documents are served through UN
  ODS.

## Open questions

- Whether point 2 should be `partial`: the explicit
  Time-Bound/Ongoing/Completed sheet split is a stronger lifecycle signal
  than UNDP's single status column (scored `false` in JSON), but still
  tracks request status, not decision supersession. Kept at `false` for
  consistency and skepticism.
- **New:** whether the Decision Monitoring Matrix is still on a live
  update cycle, or was last produced in August 2025. Decides whether
  `implementation` holds at `true`.
- Point 6 interoperability (deferred to a later round; the matrix is
  Excel, so download-form).

_Last verified: 2026-08-13 (research round 3, re-verification)._
