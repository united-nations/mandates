# UNEP — United Nations Environment Programme

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **UNEA Monitoring and Reporting Portal** (Implementation Tracker) — <https://unea.unep.org/monitoring/>

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — every one of the 150 outcomes carries a deep link to its official text on docs.un.org, page-anchored |
| 2 mandates (current vs replaced) | partial — a three-state lifecycle over the whole corpus: Closed (71), Completed (47), In progress (32); "Closed" is a terminal state distinct from "Completed", so the system does know which mandates are still live, but it records no supersession chain |
| 3 budget-linked | no — each outcome maps to the Programme of Work (125 of 150) and reports carry a free-text `resources` field (193 populated), but the field is narrative resource-adequacy prose ("within existing resources"; "UNEP has per October 2022 mobilized 78% of the PoW approved budget"), never a per-resolution monetary amount |
| 4 implementation-linked | yes — 550 reports across 13 reporting periods, Dec-2019 to Dec-2025 |
| 5 results-linked | partial — reports carry a per-outcome `results` field populated in 264 of 550, holding narrative achievements with source links, alongside challenges (179), gaps (112), best practices (133), next steps (190) and implementation plans (244); narrative, not a structured indicator framework |
| 6 interoperability | deferred (later round) — but note the portal exposes a public read JSON API under `/monitoring/api/reporting/` |

## Related portals (not linked to mandates)

- **UNEA documents and resolutions repository** — <https://www.unep.org/environmentassembly/documents-and-resolutions> — the actual repository of all resolutions, decisions and declarations adopted since 1973 by the Governing Council and UNEA.
- **Intergovernmental resolutions platform** — <https://resolutions.unep.org/> (same application as <https://apps1.unep.org/resolutions/>) — draft resolutions, co-sponsorship details, background documentation and technical notes for UNEA 3–7 plus working groups, COBSEA and GEO; banner: "This portal is no longer used for UNEA submissions"; submission behind login.

## Notes

- **Round 3 raises UNEP from 2 to 3.** Rounds 1–2 could not open the portal (redirect loops for non-JS clients, 403 on www.unep.org) and characterized it from search snippets. It is in fact **publicly readable without login** and backed by a JSON API, which round 3 read in full.
- Contents of the portal, as retrieved 2026-08-13: **150 outcomes** spanning UNEA-1 to **UNEA-7 (December 2025, already loaded — 20 outcomes)** — 115 resolutions, 28 decisions, 6 ministerial declarations, 1 other. Per outcome: code (e.g. `7/6`), title, official-text deep link, status, an extracted "Executive Director mandate" quoting the operative paragraphs (populated for 141), an "actions required" field, Programme-of-Work linkage (125), SDG linkage (106), SDG target (68), indicator (40) and project (26) linkage, named primary and secondary reporters, and a report count.
- The home dashboard additionally plots "Status of Resolutions Implementation" as Attained / Partially Attained / Not Attained across reporting periods from Dec-2020 to Dec-2026.
- Status distribution by session shows the lifecycle working as expected: UNEA-1 is 15 Closed / 3 Completed / 1 In progress, while UNEA-7 is 14 In progress / 6 Completed and 0 Closed.
- **Two corrections to round 2.** (a) The claim "no active/superseded or completed labels found" is wrong — the corpus is fully status-labelled. (b) `resolutions.unep.org` was recorded as the "repository of GC/UNEA resolutions since 1973"; it is not. It and `apps1.unep.org/resolutions` are one and the same draft-submission platform, and the repository lives on unep.org.
- Portal created per UNEA res 4/22 and the reporting framework agreed by the CPR sub-committee on 27 February 2020. Member State report *submission* is behind login; the compiled data is public.
- `https://unea.unep.org/monitoring/` redirect-loops for non-JS clients (it bounces through `login.php` to `app.php`) but resolves normally in a browser. Keep the trailing-slash form as the recorded URL.

## Governing bodies

- **United Nations Environment Assembly** — universal membership; adopts UNEP's resolutions and decisions and approves the medium-term strategy and the programme of work and budget (decision 7/6). Genuine mandating body.
- **Committee of Permanent Representatives** — per UNEP's own page, "an intersessional subsidiary organ of the United Nations Environment Assembly that: regularly reviews the implementation of the outcomes of the UN Environment Assembly; guides the development of the programme of work and budget and monitors its implementation; provides oversight regarding the work of the secretariat." Reviews, guides, monitors, oversees — no adoption of mandates. **Recommended for removal** under the rule "only bodies that adopt the entity's own mandates"; flagged for human confirmation.
- **General Assembly — the removal is questionable.** UNEP is Secretariat-administered with its own UN regular-budget section (Section 14, "Environment"), which only the General Assembly appropriates, and in our PPB 2027 extraction 61 of the 155 legislative mandates cited for UNEP are GA resolutions against 94 UNEA ones. GA res 67/213 (universal membership of the Governing Council) is cited as the source from which UNEP's mandate "derives primarily". The GA is more than constitutive here.

## Open questions

- Whether "Closed" is formally defined as *mandate lapsed* or merely *reporting closed* — no legend or glossary was found on the portal. This is what separates `partial` from `false` on point 2.
- Whether the `resources` field is ever quantified in a later reporting period (all sampled values were prose).
- Point 6 interoperability (deferred) — the public API materially changes the likely rating.

_Last verified: 2026-08-13 (research round 3, re-verification)._
