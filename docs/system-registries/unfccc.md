# UNFCCC — United Nations Framework Convention on Climate Change Secretariat

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **Decisions** (Decisions Database) — <https://unfccc.int/decisions> — searchable database of 1,034 decisions of the COP, CMP and CMA; filter by body, conference and session, sortable by symbol/name/body/date, full-text keyword search, six-language PDFs.
- **SB Mandates** ("Mandates Database", periodic PDF) — <https://unfccc.int/sites/default/files/resource/SB%20Mandates%202022.pdf> — secretariat compilation of the ongoing mandates of the two subsidiary bodies (SBI/SBSTA), each row: Issue · Mandate Reference (decision + FCCC document paras) · Session · Mandate Text · Relevant additional mandates.
- **MAS Observers mandate search tool** — <https://unfccc.int/process-and-meetings/parties-non-party-stakeholders/non-party-stakeholders/mas-observers-mandate-search-tool> — searchable by body and/or theme, but scoped to one topic (observer engagement / non-party stakeholders), not the full mandate corpus.

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — Decisions database compiles COP/CMP/CMA decision texts, searchable by body/session and full-text, publicly findable (1,034 decisions, six languages); the separate Documents portal (<https://unfccc.int/documents>) holds the wider FCCC document series |
| 2 mandates (active) | partial — the "SB Mandates" compilation tracks which subsidiary-body mandates are still live vs concluded (statuses seen: "held in abeyance", "deferred to SBI 56", "ongoing"), each tied to a decision reference — genuine active-mandate tracking, but delivered as a periodically-refreshed secretariat PDF (latest public copy 2022) covering only the SBI/SBSTA agenda, not a queryable system spanning all COP/CMA/CMP decisions; the Decisions database itself carries no in-force/superseded flag |
| 3 budget-linked | no — neither the Decisions database nor the SB Mandates compilation carries budget/financial fields; the Convention's programme budget is published as documents, not linked per decision |
| 4 implementation-linked | no — the SBI reviews implementation of the Convention/Kyoto Protocol/Paris Agreement broadly; there is no per-decision implementation-status system (the SB Mandates statuses describe the state of *consideration* of an agenda item, not implementation outcomes of requests) |
| 5 results-linked | no — no outcomes reported against specific COP/CMA decisions |
| 6 interoperability | deferred (later round) |

## Related portals (not linked to mandates)

None found beyond the universal UN portals. (The MAS Observers mandate search tool is a genuine searchable decision tool but topically narrow; listed under Systems, not scored on its own.)

## Notes

- Strongest of the three convention/tribunal gap-fill cases. Documents point is solid; the interest is entirely in point 2.
- The "SB Mandates" PDF is internally titled "Mandates Database_current" — UNFCCC does call it a database, but it is distributed as a PDF, so it clears only the weak (partial) form of the active-mandate point.
- UNFCCC clearly has the in-house capability to run a searchable mandate/decision tool (see the MAS Observers tool), which makes the absence of a general online SB-mandates tracker notable rather than a capacity gap.
- Governing body: Conference of the Parties (COP), plus the CMA (Paris Agreement), CMP (Kyoto Protocol) and the SBI/SBSTA subsidiary bodies. Grouping: `related-organization`.

## Open questions

- Whether a newer (post-2022) or online/searchable version of the SB Mandates compilation exists that would push point 2 from partial toward true.
- Point 6 interoperability (deferred): the Decisions database has structured facets — check for API/bulk export.

_Last verified: 2026-07-19 (gap-fill round)._
