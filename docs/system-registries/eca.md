# ECA — Economic Commission for Africa

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **ECA Institutional Repository** (Document Repository) — <https://repository.uneca.org/>

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — DSpace repository (search UI + REST API at `/server/api/discover/search/objects`) holds the per-session resolution compilations, e.g. "Resolutions and decision adopted by the conference of African ministers of finance, planning and economic development during the fifty-fourth session" (handle 10855/49087); current-session resolutions and the session report are also on the session site (<https://www.uneca.org/eca-events/cfm2026/documents>) |
| 2 mandates (active) | no — no in-force/superseded/lapsed status anywhere; the repository is a document archive with date/author/subject metadata only |
| 3 budget-linked | no — the statutory budget document put to the Conference ("Proposed programme plan for 2027 and programme performance for 2025 … and proposed programme budget for 2027", `2600198e.pdf`) is organized by subprogramme and deliverable; no amounts attach to individual resolutions |
| 4 implementation-linked | partial — an annual "Report on the follow-up to the resolutions of the Conference of African Ministers of Finance, Planning and Economic Development" (verified E/ECA/COE/44/8, 10 December 2025) walks the previous session's resolutions one by one, quoting each operative paragraph and narrating progress. It is an annual PDF covering only the immediately preceding session's five resolutions, not a queryable system, so it is weak-form linkage |
| 5 results-linked | no — the follow-up report narrates secretariat actions taken (already credited under point 4), not outcomes measured against the decision |
| 6 interoperability | deferred (later round) |

## Related portals (not linked to mandates)

None found beyond the universal UN portals.

## Notes

- **Dual nature.** ECA is at once an ECOSOC subsidiary organ whose member
  States meet in session, and a Secretariat entity with an Executive
  Secretary at USG level. The session of the Commission *is* the annual
  meeting of the **Conference of African Ministers of Finance, Planning and
  Economic Development** — verified on the 58th-session page, 28 March –
  3 April 2026, Tangier, Morocco
  (<https://www.uneca.org/eca-events/cfm2026>). The two names denote the
  same body; ECA numbers its sessions in the Commission series
  (58th session = CoM 2026).
- Cadence is **annual** (57th 2025 Addis Ababa, 56th 2024 Victoria Falls,
  55th 2023 …; verified at
  <https://www.uneca.org/eca-events/cfm2026/previous-sessions>).
- Resolutions are submitted onward to ECOSOC for review and endorsement —
  stated in E/ECA/COE/44/8 §2. This makes ECA resolution numbering dual:
  ECA-session resolutions surface as ECOSOC resolutions (e.g. "Resolution
  2025/3: Use of artificial intelligence to advance the socioeconomic
  development of Africa").
- The **Committee of Experts** (44th meeting, 2026) prepares the ministerial
  segment and receives the statutory reports, but its output is a report
  to the Conference, not mandates of its own — not listed as a governing
  body.
- Five subregional **Intergovernmental Committees of Senior Officials and
  Experts** (ICSOE, North/West/Central/East/Southern Africa) and two
  sectoral committees (Private Sector Development, Regional Integration,
  Trade, Infrastructure, Industry and Technology; Social Policy, Poverty
  and Gender) report their sessions to the Conference of Ministers. They
  adopt recommendations rather than mandates addressed to ECA, so they are
  likewise not listed — see Open questions.
- `www.uneca.org` serves normal clients; `repository.uneca.org` was verified
  by direct HTTP (200, TLS chain valid) and through its DSpace REST API.

## Open questions

- Whether the ICSOEs and the two sectoral committees should count as
  governing bodies: they hold numbered sessions and adopt outcome documents,
  but those are recommendations transmitted upward, not decisions binding
  the secretariat.
- Whether a document repository (as opposed to a purpose-built resolutions
  database) should clear the `documents` bar. Scored `yes` here for
  consistency with the gap-fill round's treatment of comparable per-session
  compilations; a stricter reading would make it `partial`.
- Point 6 interoperability (deferred): the repository exposes a DSpace REST
  API, which would likely score well.

_Last verified: 2026-08-13 (research round 3)._
