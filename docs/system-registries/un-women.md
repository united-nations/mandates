# UN Women — United Nations Entity for Gender Equality and the Empowerment of Women

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **Decision Monitoring Matrix** (Decision Tracking) — <https://www.unwomen.org/en/executive-board/decisions>

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — annual compendiums of Executive Board decisions, full text, 2010–2025 |
| 2 mandates (active) | no — the matrix sorts requests across sheets (Time-Bound / Ongoing / Completed / Non-Requests) by request lifecycle, per paragraph; this is per-request status, not an active-vs-superseded registry of decisions (borderline — the sheet split is more explicit than UNDP's, but decisions are never marked superseded) |
| 3 budget-linked | no — no monetary amounts tied to decisions; "SPRED (Budget)" appears only as a responsible division |
| 4 implementation-linked | yes — the Decision Monitoring Matrix (updated Aug 2025) tracks implementation of "specific and time-bound requests contained in Executive Board decisions" per paragraph: columns ExB Decision / Paragraph / Request (verb) / Deadline / Responsible Division / Progress and follow-up action / Notes, with dated progress entries |
| 5 results-linked | no — the Progress and follow-up action column records actions taken (noted / in progress / implemented), not outcomes; results reporting is Strategic-Plan-based |
| 6 interoperability | deferred (later round) |

## Related portals (not linked to mandates)

- **UN Women Data Hub / Data Portal** — <https://data.unwomen.org/data-portal> — gender statistics organized by SDG indicators, thematic areas (violence against women, women peace and security, etc.), and country fact sheets; not linked to governing-body decisions.

## Notes

- Governing body is UN Women's **own Executive Board** (GA res 64/289, 2010; 41 members elected by ECOSOC for three-year terms), which supervises operational activities; ECOSOC links it to the Commission on the Status of Women, and it operates under overall GA/ECOSOC policy guidance. governingBodies: `un-ga`, `un-ecosoc`, and its own Executive Board.
- Structurally the closest sibling to UNDP/UNFPA (documents + implementation, score 2): a per-request implementation-tracking matrix over compiled decisions, with no monetary linkage and no active-vs-superseded decision registry. The matrix is a downloadable Excel workbook (5 sheets) rather than a queryable web system.
- Round 2 (gap-fill): matrix content verified directly by downloading the Second Regular Session 2025 workbook (executive_board_decision_monitoring_matrix_srs_2025) and inspecting all sheet headers and entries.

## Open questions

- Whether point 2 should be `partial`: the explicit Time-Bound/Ongoing/Completed sheet split is a stronger lifecycle signal than UNDP's single status column (scored `false` in JSON), but still tracks request status, not decision supersession. Kept at `false` for consistency and skepticism.
- Point 6 interoperability (deferred to a later round; the matrix is Excel, so download-form).

_Last verified: 2026-07-19 (gap-fill round)._
