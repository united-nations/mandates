# PAHO — Pan American Health Organization

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

PAHO is not a WHO sub-unit. It is a separate inter-American treaty
organization, founded in 1902 as the International Sanitary Bureau, with
its own constitution, its own 35 Member States and four Associate Members,
and its own three-tier governance. It simultaneously serves as WHO's
Regional Office for the Americas (AMRO): PAHO's own words are that it
"wears two institutional hats" (<https://www.paho.org/en/who-we-are>,
verified). The dual status is visible in the session titles — the 62nd
Directing Council of PAHO *is* the 77th Session of the Regional Committee
of WHO for the Americas — but the mandates scored here are PAHO's own,
adopted by PAHO's own bodies. PAHO reports $17.5bn of expenses to CEB
(2011–2024), which would place it around 7th in the whole UN system.

## Governing bodies

Three tiers, all of which adopt PAHO's own mandates:

- **Pan American Sanitary Conference** — supreme governing authority; meets
  every 5 years; elects the Director and determines general policy; adopts
  `CSP__.R__` resolutions.
  <https://www.paho.org/en/governance/pan-american-sanitary-conference>
- **Directing Council** — acts on behalf of the Conference between its
  sessions; meets annually in non-Conference years; approves the Strategic
  Plan and the biennial Program Budget; adopts `CD__.R__` resolutions
  (e.g. CD60.R2, Program Budget 2024–2025).
  <https://www.paho.org/en/governance/directing-council>
- **Executive Committee** — 9 Member States, overlapping 3-year terms;
  meets twice a year as a committee of the Conference or Council; adopts
  `CE___.R__` resolutions and prepares the Council/Conference agenda.
  <https://www.paho.org/en/governance/executive-committee>

The **Subcommittee on Program, Budget and Administration** (7 members, at
least one session a year) is an auxiliary advisory body that makes
recommendations to the Executive Committee; it adopts no mandates of its
own and is therefore not listed as a governing body.

## Systems

- **Mandates and Strategies** (Mandate document listing) — <https://www.paho.org/en/mandates-and-strategies>
- Supporting artefacts: **IRIS** institutional repository
  (<https://iris.paho.org/>, DSpace 7 with a public REST API), per-session
  governing-body document pages, and the triennial **Monitoring of the
  Resolutions and Mandates of the Pan American Health Organization**
  report (CD62/INF/3, 2025) with its **Active PAHO Resolutions** annex,
  linked directly from the governance landing page.

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — "Mandates and Strategies" is a faceted listing (Topic facet with 200+ terms, date-range filter, ~45 pages) of PAHO resolutions, plans of action, strategies and related WHO/UN mandates; every session of every body has a document page listing Working / Information / Resolutions / Official Documents, and full texts sit in IRIS, a DSpace 7 repository with a working REST API (`/server/api/discover/search/objects`, verified) |
| 2 mandates (active) | partial — CD62/INF/3 (5 August 2025) classifies **every** resolution adopted 1999–2024 as Active, Conditional Active or Sunset against published criteria (Table 1), names the superseding resolution where one exists, and reports the totals: 403 resolutions adopted, 272 sunset, 131 carried forward (78 Active, 8 Conditional Active, 45 sunset within the analysed set). Mandated by Resolution CD55.R11 (2016), which requires the Bureau to report on the status and implementation of resolutions **at least every three years**; editions in 2016 (CD55/18 Rev.1), 2019 (CD57/INF/3), 2022 (CSP30/INF/5), 2025 (CD62/INF/3). The active-only extract is published as a standing "Active PAHO Resolutions" link on the governance page. Weak form: a triennial PDF report, not a queryable register — hence partial, not yes |
| 3 budget-linked | no — the Program Budget and the PB portal (pbdigital.paho.org) are organized by Strategic Plan outcome/output, country and biennium; no monetary amounts are attached to individual resolutions anywhere, and the monitoring report carries no financial column |
| 4 implementation-linked | partial — the monitoring methodology assesses, per resolution, "whether each commitment established for the Bureau and the Member States in the operative paragraphs of the resolution has been met or whether the mandate remains in force", and whether the stipulated progress reports "were submitted as stipulated". The annex publishes this per resolution as four columns: Reporting Requirement · Report(s) actually presented (with document symbols and years) · Status · Justification. Real per-decision report-back tracking, but delivered as a triennial PDF table, not a system |
| 5 results-linked | partial — PAHO runs a per-resolution reporting series to the Governing Bodies: final reports and progress reports on the plans of action and strategies endorsed by named resolutions (e.g. CD62/INF/5 "Strategy for the Prevention and Control of Noncommunicable Diseases: Final Report", CD62/INF/6 "Health of Migrants: Final Report", CD62/INF/8 "Progress Reports on Technical Matters"), and the monitoring annex indexes which of these exist per resolution. Structurally the same weak form as WHO's consolidated WHA progress reports, which scored partial |
| 6 interoperability | deferred (later round) |

## Related portals (not linked to mandates)

- **PAHO Program Budget Web Portal (PBE)** — <https://pbdigital.paho.org/en/implementation/2026-2027/home> — quarterly budget, financing and implementation data by outcome/output, subregion and country, for the 2022–23, 2024–25 and 2026–27 bienniums, plus End-of-Biennium reports; IATI-aligned. Not linked to resolutions.
- **PAHO/EIH Open Data (PLISA)** — <https://opendata.paho.org/en> — regional health statistics; not financial and not mandate-linked.
- The older `open.paho.org` Program Budget portal no longer resolves (DNS failure on 2026-08-13); pbdigital.paho.org has replaced it.

## Notes

- CD62/INF/3 is the single most useful artefact found for PAHO. Its Table 1
  publishes explicit criteria: **Active** = stipulated lifespan still in
  effect, or commitments not met/not renewed and continuity deemed
  important; **Conditional Active** = lifespan ended but compliance status
  unknown, or no longer relevant though some commitments are unmet;
  **Sunset** = by nature requiring no monitoring (elections, quota scales,
  staff-rule changes), lifespan ended and commitments met or revisited,
  conditions changed making it irrelevant, or superseded by a later
  resolution.
- The full text was retrieved through the IRIS REST API
  (`/server/api/core/bitstreams/…/content`) after both `curl` and WebFetch
  were refused on the legacy `bitstream/handle/` URL; the browser-rendered
  path works. The Annex is also mirrored on paho.org at
  <https://www.paho.org/sites/default/files/2025-11/cd62-inf-3-e-resolutions-mandates-paho-annex_0.pdf>
  (verified).
- The report also records what PAHO changed as a result of the exercise:
  new resolutions must carry explicit reporting requirements, resolutions
  with unspecified end dates were reviewed and given recommended timelines,
  and reporting on related resolutions has been consolidated.
- The same monitoring document goes first to the Executive Committee
  (CE176/INF/3, June 2025) and then to the Directing Council
  (CD62/INF/3, September–October 2025).
- No dedicated governing-bodies-secretariat contact is published; the
  general Inquiries page is the only public channel found.

## Open questions

- Points 4 and 5 are the two most contestable calls in this dossier. Point
  4 rests on a triennial compliance table rather than a running tracker;
  point 5 rests on a report series of the same shape that earned WHO a
  partial. A stricter reading would put both at 0 and PAHO at 1.5.
- Whether the monitoring exercise will move from a triennial PDF to a
  maintained web register — that alone would take point 2 to yes.
- Whether the Program Budget or the End-of-Biennium assessment costs
  individual resolutions anywhere (WHO does this for WHA resolutions); no
  evidence found, but the PB document tables were not read line by line.
- Point 6 interoperability: IRIS exposes a DSpace 7 REST API, which is the
  strongest interoperability signal seen so far in this survey.

_Last verified: 2026-08-13 (research round 3)._
