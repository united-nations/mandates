# FAO — Food and Agriculture Organization

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **Conference Resolutions Portal** (Resolutions Database) — <https://resolutionsportal.fao.org/>
  — live, 1,287 resolutions, but **frozen at the 42nd Session (2021)**.
- **Conference resolutions index, all sessions** (Session Documents) —
  <https://www.fao.org/unfao/govbodies/gsbhome/conference/resolutions/en/>
  — the older GSB index; chronological (1st Session 1945 → 44th Session
  2025) plus an alphabetical list. This, not the portal, is the current
  complete compilation. Per-session pages, e.g.
  <https://www.fao.org/unfao/govbodies/gsbhome/conference/resolutions/2025/en/>
  (14 resolutions, 44th Session, 28 June – 4 July 2025).

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — but split across two sources: the modern portal (to 2021) and the GSB index (to 2025) |
| 2 mandates (active) | **partial** (round 3 downgrade, was `yes`) — the portal's "Type of modification" facet (Insertion / Substitution / Repeal) tags the resolution that *performs* the change to the Basic Texts, not the resolution that was superseded: `?modtype=repeal` returns **19 documents out of 1,287**, all of them amending acts. It drives a versioned Constitution / Basic Texts view (a genuine in-force lineage for the constitutional corpus), but the other ~1,268 resolutions carry no active/superseded status at all. Verified on the live portal and on resolution 8/2021 |
| 3 budget-linked | no — the portal has a "Budget" subcategory but no financial data per resolution. Budget resolutions carry their own appropriation (e.g. 8/2021, USD 1,005,635,000 by chapter), which is the resolution text, not a system linkage. Transparency Portal budget data is organized by PWB/Strategic Framework |
| 4 implementation-linked | no — no per-resolution implementation status in any FAO system found in three rounds |
| 5 results-linked | no — Programme Implementation Report (incl. the PIR Results View on the Transparency Portal) reports against Strategic Framework results; the PIR regime was itself created by Conference Res 10/2009 but reporting is not per-resolution |
| 6 interoperability | strong signal, still deferred — the portal is Akoma Ntoso native (URIs of the form `/akn/un/statement/deliberation/fao/2021-06-18/8-2021/eng@/!main`) and offers bulk **XML / PDF / HTML archive** downloads. Highest form-rating seen so far among the eight agencies in this batch |

## Related portals (not linked to mandates)

- **FAO Transparency Portal** — <https://www.fao.org/transparency/en> — live,
  last updated 7 May 2026. Programme/Budget & HR dashboard (incl. PIR
  Results View), project dashboard, voluntary-contribution data, oversight
  and evaluation. Organized programmatically/geographically; no resolution
  linkage anywhere.

## Notes

- **Round 3 (2026-08-13) link check: all recorded URLs live.**
  `resolutionsportal.fao.org` 200, `fao.org/governing-bodies/en` 200,
  `fao.org/transparency/en` 200. Per-body pages also exist and are better
  targets than the generic overview: `/governing-bodies/conference` 200,
  `/governing-bodies/council` 200.
- **Portal staleness is the headline change.** The 43rd Session (2023) and
  44th Session (2025) are still absent; the session list ends at "42nd
  Session (2021), 11 resolutions". The round-2 open question is therefore
  answered in the negative for now.
- **Governing bodies re-cut under the round-3 rule** (only bodies that
  adopt FAO's own mandates):
  - **Conference** — keep. Adopts resolutions and votes the appropriations.
  - **Council** — keep. Executive organ of the Conference; five regular
    sessions per biennium; decides on programme and budget execution.
  - **Council Committees** (Programme, Finance, CCLM) — **remove.**
    Advisory to the Council; they report and recommend.
  - **Technical Committees** (COAG, COFI, COFO, CCP) — **remove.** Subject
    bodies that report to the Council and recommend.
  - **Regional Conferences** — **remove**, with reservation. FAO's Basic
    Texts do call them Governing Bodies (post-2009 IPA reform), and FAO's
    own site lists them as such, but their function is to "put forward
    recommendations", reporting to the Council on programme and budget
    matters and to the Conference on policy and regulatory matters. They
    approve nothing of FAO's own. This is the clearest borderline case in
    this batch — see UNCERTAINTIES.

## Open questions

- Will the Akoma Ntoso portal be extended past 2021, or has FAO reverted to
  the GSB index? Two live compilations of the same corpus with different
  cutoffs is itself a finding.
- Whether the Council's own decisions/conclusions are compiled anywhere
  (only session reports found); point 6 formally unassessed.

_Last verified: 2026-08-13 (research round 3, re-verification)._
