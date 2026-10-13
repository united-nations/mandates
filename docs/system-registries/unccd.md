# UNCCD — United Nations Convention to Combat Desertification Secretariat

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **COP decisions** (Decisions compilation) — <https://www.unccd.int/convention/cop-decisions> — decisions of every COP session, listed per session as PDFs (e.g. 1/COP.16 … 37/COP.16).
- **Official documents** — <https://www.unccd.int/convention/official-documents> — per-session listings for the COP and its two subsidiary bodies, the CRIC and the CST.

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — COP/CRIC/CST decision and document texts are compiled per session and publicly findable; **re-confirmed round 3 that this is a per-session PDF listing, not a queryable system** |
| 2 mandates (active) | no — no in-force/replaced tracking anywhere; only per-session decision listings |
| 3 budget-linked | no — the Convention budget is adopted per COP (e.g. decision 10/COP.16, "Programme and budget") and published as a document, not linked per decision |
| 4 implementation-linked | no — implementation is reviewed via the CRIC through the PRAIS national-reporting system, organized by the five Strategic Objectives / LDN indicators per country, not against specific COP decisions |
| 5 results-linked | no — PRAIS reports SO/LDN indicator results by country and region, not outcomes against specific decisions |
| 6 interoperability | deferred (later round) |

## Notes — the point-1 re-check (the round-3 question)

The gap-fill round asked whether a real searchable decisions database exists behind
the static per-session listings. **It does not.** Both pages were re-fetched:

- `/convention/cop-decisions` — sessions newest first (COP 16 Riyadh 2024 → COP 1 Rome 1997), decision number, title and a direct **English PDF** link per decision. **No search box, no filters or facets, no adoption dates, no status indicators, and no multi-language versions in the listing.** The page's own fallback is human: "if you experience download issues, contact `secretariat [at] unccd.int`", with Word versions "available upon request".
- `/convention/official-documents` — same shape, wider scope: **COP 1–17 (1997–2026), CRIC 1–24 (2002–2026), CST 1–17 (1997–2026)**. COP 17 (Ulaanbaatar, Mongolia, 2026) is already present, with per-document pages under `/convention/official-documents/cop-17-ulaanbaatar-mongolia-2026/documents/…`.

So the round-2 scoring stands: `documents = true` on the "compiled and publicly
findable" reading, but this is the weakest form of that point and will cost UNCCD
on the deferred interoperability point.

## Related portals (not linked to mandates)

- **PRAIS 4 reporting platform** — <https://reporting.unccd.int> — Performance Review and Assessment of Implementation System. Round 3: the URL now **302-redirects to a login page** (`/account/login/?next=/`), so the platform itself is credential-gated; the public description lives at <https://www.unccd.int/data-knowledge/unccd-national-reporting-process>. Organized by country and strategic-objective indicator, not by COP decision.
- COP 17 hub — <https://www.unccd.int/cop17> (HTTP 200).

## Notes

- Round 3 link check: `/convention/cop-decisions`, `/convention/official-documents`, `/convention/governance/cop`, `/convention/overview` and `/convention/governance/process-management-bodies` all HTTP 200. Only `reporting.unccd.int` changed behaviour (login redirect).
- **Contact correction.** The recorded contact pointed at `/convention/governance/process-management-bodies`, which was re-read in round 3 and is **not a contact page** — it describes the COP, CRIC and CST bureaux and publishes no address or email. The real contacts page is <https://www.unccd.int/about-us/contacts> (HTTP 200): switchboard "00 49 228 815 2800", `secretariat [at] unccd.int`, "P.O. Box 260129, D-53153 Bonn, Germany" / "Platz der Vereinten Nationen 1, D-53113 Bonn, Germany", plus the New York liaison office and four regional liaison offices with named officers. (`/contact` also exists but carries only a blank enquiry form.)
- The UNCCD-absent-from-the-UN-system-chart question is resolved: it reports financial data to CEB, so it is in scope under [`../un-system-scope.md`](../un-system-scope.md).
- Governing body: Conference of the Parties (COP), biennial (COP 16 Dec 2024 Riyadh; COP 17 Ulaanbaatar 17–28 Aug 2026), with the CRIC and CST subsidiary bodies. Recorded COP entry re-verified.

## Open questions

- Round 6 interoperability (per-session HTML listings, PDF only, no facets — expect a low score).

_Last verified: 2026-08-13 (research round 3, re-verification)._
