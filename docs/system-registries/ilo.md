# ILO — International Labour Organization

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **Governing Body Documents** (Decisions Database) — <https://www.ilo.org/governing-body/all-gb-documents>
  — live and genuinely faceted: keyword search plus filters for GB session
  (284th–358th, 2002–2026), GB section/segment, document type (incl.
  "Record of decisions", "Record of proceedings"), and publication-date
  range; 306 result pages. Individual decisions also have their own stable
  pages, e.g. `/resource/record-decisions/gb/gb356/…`.
- **Resolutions adopted by the International Labour Conference** (Session
  Documents) — <https://www.ilo.org/resource/conference-paper/resolutions-adopted-international-labour-conference>
  — static chronological table, 1919 to present, linking out to LABORDOC.
  Second-tier: a finding aid, not a system.

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — the GB document search is the strongest documents case in this batch of eight |
| 2 mandates (active) | no — round 3 re-confirmed on the live search: no in-force / superseded / lapsed facet or field, on either the GB search or the ILC resolutions table |
| 3 budget-linked | no — no system links decisions to amounts; decision pages carry no financial fields. Individual GB papers contain ad-hoc financing clauses ("financed from savings in Part I") as document text only |
| 4 implementation-linked | **partial** — the standing "Follow-up to Governing Body decisions" report series gives the GB an overview of the action taken on decisions adopted at earlier sessions (GB.343 first supplementary report; GB.352 noting follow-up to decisions Nov 2022 – Jun 2024). A document series, not a database. **Scored here rather than under results** — see the placement fix below |
| 5 results-linked | no — nothing reports outcomes achieved against a specific decision |
| 6 interoperability | deferred — HTML search + PDF documents; no export or API found |

## Related portals (not linked to mandates)

- **ILO Development Cooperation Dashboard** — <https://webapps.ilo.org/DevelopmentCooperationDashboard/>
  — live (round 3: HTTP 200 with a browser user-agent; plain fetchers get
  403). Budget/expenditure/projects for voluntary contributions (RBSA +
  XBDC), filterable by partner, country, P&B outcome, SDG. Not linked to GB
  decisions.

## Notes

- **Round 3 (2026-08-13) link check: all live**, no redirects, no content
  drift. `ilo.org/ilo-governing-body` 200, `all-gb-documents` 200,
  `webapps.ilo.org/DevelopmentCooperationDashboard/` 200.
- **Placement fix (round 3).** The dossier previously scored the follow-up
  series under point 5 (results) while `un-system.json` had it under point
  4 (implementation). The JSON was right and the dossier is now aligned:
  the reports describe **Office action taken**, not outcomes achieved.
  Total score is unchanged at 1.5.
- **Missing governing body added: the International Labour Conference.**
  The ILO's own page is explicit that the Governing Body "adopts the draft
  Programme and Budget of the Organization **for submission to the
  Conference**" — the GB proposes, the Conference approves. The Conference
  also adopts Conventions, Recommendations and resolutions (114th Session,
  1–12 June 2026, adopted the first Convention on decent work in the
  platform economy). Under the round-3 rule it is unambiguously a
  mandate-adopting body for the ILO and had been omitted.
  Landing page: <https://www.ilo.org/international-labour-conference>.
- No other tier qualifies: the GB's sections and segments are parts of the
  GB itself, not separate bodies, and the Regional Meetings adopt
  declarations addressed to constituents, not mandates for the Office.
- No post-2024 instance of the standing follow-up series was located this
  round. Follow-up is currently most visible as report-back clauses inside
  individual decision records (GB.356, March–April 2026, requesting a
  contingency framework for approval at GB.357) — obligations recorded in
  text, with no tracker behind them. This keeps point 4 at `'partial'` and
  argues against promoting it.

## Open questions

- Cadence and coverage of the follow-up series after 2024 (all decisions,
  or a selection?). If it has quietly lapsed, point 4 drops to `false`.
- Whether LABORDOC exposes any status metadata for ILC resolutions; point 6
  unassessed.

_Last verified: 2026-08-13 (research round 3, re-verification)._
