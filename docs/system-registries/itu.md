# ITU — International Telecommunication Union

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **Council Resolutions & Decisions** (Resolutions in Force) — <https://www.itu.int/pub/S-CONF-CL>
  — live; the **2025 edition** is now the latest, with editions back to 2002.
  Free electronic file. An in-force compilation in PDF form.
- **ITU-R Resolutions** (Resolutions in Force) — <https://www.itu.int/pub/R-RES>
  — **found in round 3; missed by rounds 1–2.** A web list of every
  Radiocommunication Assembly resolution with its title *and its status*:
  entries carry explicit notes such as "Note – Suppressed (RA-1993)" and
  "Note – Suppressed (RA-23)". This is a per-resolution active/superseded
  flag delivered as a web page, not a PDF — the strongest mandate-status
  artefact ITU has.
- **WTSA Resolutions, Opinions and Actions** (Resolutions in Force) — <https://www.itu.int/pub/T-RES>
  — **also found in round 3.** Per-resolution current consolidated texts,
  each stamped with the assembly that last revised it ("Resolution 2 –
  (Rev. New Delhi, 2024)", "Resolution 31 – (Rev. Dubai, 2012)"), so the
  live version of each ITU-T resolution is identifiable at a glance.
- **ITU-D / WTDC Resolutions** — <https://www.itu.int/en/ITU-D/Pages/Resolutions.aspx>
  — live; the WTDC-22 (Kigali) set, with WTDC-25 outcomes published as the
  conference Final Report. Weaker than the other two: a list without status
  notes.

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — four parallel compilations (Council, ITU-R, ITU-T, ITU-D); PP Final Acts partly behind free registration/TIES |
| 2 mandates (active) | yes — **but the basis has changed.** Rounds 1–2 credited this to the Council PDF, which on its own would only be `'partial'` under the round-3 reading of "document series ≠ system". The credit now rests on the ITU-R Resolutions page's per-resolution "Suppressed" notes and the ITU-T page's revision stamps, both web-native and both current |
| 3 budget-linked | no — the in-force compilations include budget resolutions as documents but carry no financial data; Council reporting mentions budget only at aggregate level |
| 4 implementation-linked | no — **round-2 open question now resolved negatively.** The "web-based platform reporting on the implementation of ITU Plenipotentiary Conference Decisions and Resolutions", referenced from the annual activities report, is **dead**: `itu.int/net4/Search/CL24/Main/Reader` redirects to an ASP.NET `500.html` error page, and CL25 and CL26 do the same. There is no working per-resolution implementation tracker |
| 5 results-linked | no — the annual report to Council (per PP Res 71) has a "Status of Implementation of PP Resolutions" section, but that is narrative status inside a document, not results reporting against resolutions |
| 6 interoperability | deferred — mixed: PDF for the Council compilation, HTML for ITU-R/ITU-T; no export or API |

## Related portals (not linked to mandates)

- **ITU Council snapshot report** — <https://www.itu.int/reports/council/>
  — live and **refreshed**: now the 2026 Council session (Geneva,
  28 April – 8 May 2026). Notably it does narrate implementation of named
  Council resolutions (1424 on Palestine, 1408 on Ukraine) — prose in a
  session report, not a system, so it stays unscored.
- **Annual activities report** — <https://council.itu.int/2024/en/networking/resources/annual-activities-report/>
  — still live for the 2024 session (report C24/35, Power BI dashboards on
  Connect 2030 targets). **The 2025 and 2026 equivalents 404**; the current
  report is C26/35, the four-year report to PP-26 covering 2022 – Q1 2026.
  The recorded 2024 URL is a frozen session-site artefact and should be
  treated as such.

## Notes

- **Round 3 (2026-08-13) link check.** `itu.int/pub/S-CONF-CL` 200 (edition
  advanced to 2025), `itu.int/hub/membership/how-we-are-governed/` 200,
  `itu.int/reports/council/` 200 (content advanced to the 2026 session),
  `council.itu.int/2024/…/annual-activities-report/` 200,
  `council.itu.int/{2025,2026}/…` **404**, `itu.int/net4/Search/CL24/Main/Reader`
  **500**.
- **Governing bodies: ITU's own page draws the line for us.** "How we are
  governed" states the Union "is governed by the Plenipotentiary Conference
  and the ITU Council", then lists separately the **"Governing bodies of the
  3 ITU Sectors"**: World Radiocommunication Conference, Radiocommunication
  Assembly, World Telecommunication Standardization Assembly, World
  Telecommunication Development Conference — alongside the advisory groups
  (RAG, TSAG, TDAG) and the Radio Regulations Board.
  - **Keep:** Plenipotentiary Conference, Council.
  - **Recommended additions:** WRC, Radiocommunication Assembly, WTSA,
    WTDC. Each adopts resolutions that mandate ITU's own sector work — the
    R-RES and T-RES compilations above are literally the output of two of
    them. Flagged for the inclusion rule; see UNCERTAINTIES.
  - **Exclude:** RAG / TSAG / TDAG (advisory groups by name and function)
    and the Radio Regulations Board (a regulatory/quasi-judicial board, not
    a mandate-adopting organ).
- PP-26 runs 9–27 November 2026 and will re-cut the PP resolution set; the
  in-force compilations should be re-checked after it.

## Open questions

- Whether the dead net4 reader is being rebuilt for PP-26 or has been
  abandoned. If it returns and reports per resolution, point 4 changes.
- Whether the ITU-R "Suppressed" notes are maintained exhaustively or only
  on a subset; point 6 unassessed.

_Last verified: 2026-08-13 (research round 3, re-verification)._
