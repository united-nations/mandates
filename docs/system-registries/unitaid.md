# Unitaid

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

Unitaid is a global health partnership founded in 2006 by Brazil, Chile,
France, Norway and the United Kingdom, hosted by WHO in Geneva — its own
site states "Unitaid is a hosted partnership of the World Health
Organization" and its pages carry a WHO copyright line. Hosting is
administrative: Unitaid has its own Constitution, its own Executive Board
and its own budget, and WHO sits on that Board as one member among
thirteen. It reports $1.6bn of expenses to CEB (2011–2024).

## Governing bodies

- **Executive Board** — 13 members representing Brazil, Chile, France,
  Norway, the United Kingdom, Spain, the Republic of Korea, Japan, the
  African Union constituency, NGOs, communities living with the diseases,
  foundations and WHO; decides by consensus; meets roughly twice a year
  (June and December, with the 50th meeting held 2–3 July 2026) and also
  adopts **e-Resolutions** between meetings. It approves the annual budget
  (R8, Dec 2025: "Approval of the 2026 Unitaid Budget"), the strategy and
  its mid-term review, each new "Area for Intervention", individual grant
  authorizations, the Board Operating Procedures and committee
  appointments. <https://unitaid.org/executive-board/>

The Finance & Accountability Committee, the Policy & Strategy Committee,
the Governance Working Group and the Proposal Review Committee all report
to the Board and are advisory; they adopt no mandates and are not listed.
WHO's own governing bodies have no role in Unitaid's governance.

## Systems

- **Board documents** (Board decisions archive) — <https://unitaid.org/board-documents/>

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — three tabs: *Board meeting documents* (per-meeting listing with Meeting No. and Date filters; each meeting shows its resolutions R1…Rn as individual PDFs, plus minutes, agenda and background papers; 7 paginated pages of meetings, the oldest directly read being the 41st, December 2022), *e-Resolutions* (32 pages, year filter plus free-text keyword search, each entry carrying its code — e.g. `R4-2026-e` — title and PDF), and *Key governance documents* (Constitution, Board Operating Procedures, Code of Ethical Conduct). Genuinely searchable and complete for the Board's own output |
| 2 mandates (active) | no — no in-force / superseded / lapsed status anywhere; both tabs are chronological. Some resolutions plainly replace earlier ones (successive "Extension of appointment…", "Revised Calendar…", budget approvals) with no marking |
| 3 budget-linked | partial — money and mandate are the same document: each investment resolution states the amount the Board authorizes, e.g. R4-2026-e authorizes the Executive Director "to commit an amount of up to US$ 18,500,000 to the Enabler Grant 2026-2027" plus a further US$ 1,500,000 (verified in the resolution PDF). So a per-decision monetary figure is published for every funding decision — but it is carried in the resolution text, not surfaced, aggregated or tracked by the portal, and there is nothing that reports disbursement against a decision. Scored partial; see open questions |
| 4 implementation-linked | no — follow-up runs through the Key Performance Indicator reports (e.g. "2023-2027 Strategy – Key Performance Indicator report (June 2025)") and the Executive Director's report, both organized by strategic objective and organizational KPI, not by resolution; no per-decision status matrix |
| 5 results-linked | no — results are reported at strategy and portfolio level (KPI framework, the 2025 Mid-Term Review of the 2023–2027 Strategy and its technical annex, independent evaluations), never against a named resolution |
| 6 interoperability | deferred (later round) |

## Related portals (not linked to mandates)

- **Projects** — <https://unitaid.org/projects/> — the grant portfolio, browsable by disease area and partner; describes what was funded, not which resolution funded it.
- **Evaluations** — <https://unitaid.org/evaluations/> — independent external assessments of Unitaid's work; results-side, not decision-linked.

## Notes

- Board meeting numbering has gaps in the public listing (50, 48, 46, 45,
  44, 43, 42, 41 …); intervening numbers appear to be extraordinary or
  virtual sessions whose documents are not posted separately.
- `unitaid.org` is behind Cloudflare and returns 403 to WebFetch and to
  `curl`; every finding here was verified through a headless browser, and
  the resolution PDF was retrieved with a plain Python client, which the
  WAF does accept. Nothing in this dossier rests on a search snippet.
- The 2025 Tokyo meeting (48th) is a good illustration of the mandate mix
  in one session: mid-term strategy review, two constituency budget
  revisions, the 2026 budget, a KPI framework revision, a next-generation
  financing decision and five appointment or term-extension resolutions.
- Contact is a web form; no governance-secretariat email is published, and
  the site directs enquirers to individual staff listed on the "our
  organization" page.

## Open questions

- The budget call is the one to review. Unitaid publishes money per
  decision more consistently than almost anyone in this survey — but
  because the decision *is* a funding authorization, not because any system
  links the two. If the scheme means "a system that links mandates to
  budget information", this should be 0 and Unitaid scores 1; if it means
  "per-decision monetary amounts are published and findable", partial is
  right and Unitaid scores 1.5.
- Whether the Finance & Accountability Committee receives a
  disbursement-against-authorization report that would count under point 3
  or 4; committee papers are not published.
- How far back the Board meeting archive actually runs (7 pages were
  paginated by AJAX and only the first was readable; meeting 41, December
  2022, was the oldest confirmed by direct reading).

_Last verified: 2026-08-13 (research round 3)._
