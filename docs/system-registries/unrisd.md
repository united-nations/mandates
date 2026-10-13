# UNRISD — United Nations Research Institute for Social Development

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- None scored. UNRISD is an autonomous research institute governed by **the Board**, which under the 1963 statutes reviews and approves the work programmes and the relevant budgets. A **numbered Board document series does exist** (`Board/12/3`, `Board/17/3` "Fifty-fourth Session of the Board, 28 April 2017", `BOARD/2025/4-a`), but it is **not published as a browsable series**: the current site has no governance or board-documents page at all, and the surviving PDFs are reachable only as stray `cdn.unrisd.org/assets/legacy-files/…` URLs left over from the old site. Public reporting is the annual report, addressed to the Board, donors, partners and the public.

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | no — Board session documents exist and are symboled, but no index, listing or landing page for them is published; only isolated legacy PDFs survive at CDN paths. Weaker than UNITAR (complete published session-report series) and weaker even than UNU/UNICRI, which at least publish their governing-body annual report as a series |
| 2 mandates (active) | no — no in-force/superseded tracking; the Board approves work programmes and budgets (statutes, para. 3(b)) and adopts strategy decisions (e.g. `BOARD/2025/4-a`, May 2025, on the 2026–2030 strategic period), but no active-mandate registry exists |
| 3 budget-linked | no — "Annual budget estimates shall be prepared by the Director and submitted to the Board for approval" (statutes, para. 5), but published finance is org-level only (2023 IPSAS-based expenditure USD 3.469M; institutional and earmarked funder lists by year) with no link to Board decisions |
| 4 implementation-linked | no — no per-decision implementation reporting |
| 5 results-linked | no — annual reports and evaluations report against the institutional strategy and programme areas, not against specific Board decisions |
| 6 interoperability | deferred (later round) |

## Related portals (not linked to mandates)

- **Annual Reports and Evaluations** — <https://www.unrisd.org/en/about/annual-reports-and-evaluations> — annual reports (latest 2025) plus evaluations; described on the page as "the Institute's primary reporting mechanism to the Board, donors, partners and the public". Narrative and results, not decision-linked.
- **Funding & Support** — <https://www.unrisd.org/en/about/funding-support> — named institutional and earmarked funders by year plus a single expenditure total; prose, no dataset or dashboard, no decision linkage.

## Notes

- Governing body: **the Board of UNRISD**. Under the founding statutes (Secretary-General's Bulletin **ST/SGB/126, 1 August 1963**) it comprises a **Chairman appointed by the Secretary-General**; **five members nominated by the Social Commission and confirmed by ECOSOC**; a representative of the Secretary-General; the directors of certain regional development-planning institutes; representatives of two of ILO/UNESCO/FAO/WHO by rotation; and the Director of the Institute ex officio (<https://cdn.unrisd.org/assets/about/mission-and-mandate/unrisd-statutes.pdf>, verified).
- Functions (statutes, para. 3): (a) lay down general rules governing the action of the Institute; (b) **review and approve work programmes and the relevant budgets**; (c) submit regularly a progress report on the Institute's work to the Social Commission — today the **Commission for Social Development**, with nominations still confirmed by ECOSOC (e.g. decision `E/DEC/2024/221`, "Nomination of members of the Board of UNRISD").
- **Practice has drifted from the statutes.** The 1963 text provides for five nominated members; the site currently lists **ten** Board members serving in personal capacity, drawn from academia and policy: Chair **Azita Berar Awad** (Switzerland), with Jenina Joy Chavez (Philippines), Olivier De Schutter (Belgium), Naila Kabeer (Bangladesh), Graziella Moraes Silva (Brazil), Godwin Murunga (Kenya), Leila Patel (South Africa), Diego Sanchez-Ancochea (Spain), Dzodzi Tsikata (Ghana), Timo Voipio (Finland) (<https://www.unrisd.org/en/about/our-team>, "Board" tab, verified in a headless browser).
- The site describes Board members as playing "an advisory and oversight role" — softer than the statutory power to approve work programmes and budgets. The statutory text governs for this dossier's purposes.
- Sessions are numbered and roughly annual (54th session, 28 April 2017 — `Board/17/3`); a Board decision of May 2025 (`BOARD/2025/4-a`) approved the roadmap and strategy-development process for the 2026–2030 strategic period.
- UNRISD is financially independent of the UN regular budget and funded entirely from voluntary contributions; its finances consolidate under `UN` in the CEB dataset. Offices in Geneva (Palais des Nations) and Bonn.
- The website is a Vue single-page app served from a token-protected API (`api.unrisd.org` returns 403 without an `Authorization` header); plain fetching returns an empty shell, so every UNRISD page here was rendered in a headless browser.
- Contact: no Board-secretariat contact is published. General: <mailto:info.unrisd@un.org>, +41 22 917 3060, Palais des Nations, 1211 Geneva 10; Bonn office <mailto:unrisd.bonn@un.org>, +49 228 815 0670 (<https://www.unrisd.org/en/about/get-in-touch>, verified).

## Open questions

- Whether the `Board/…` document series is published anywhere systematically (a legacy index, the UN Digital Library, or an internal Board portal). The UN Digital Library holds catalogued historical Board documents (e.g. 18th session 1980, 30th session 1992); the current unrisd.org has no governance page. Not resolved in this round.
- The Board's exact official name: the statutes say only "a Board", the site's tab says "Board", and UN documents say "the Board of the United Nations Research Institute for Social Development". Recorded here as **the Board**.
- Point 6 interoperability (deferred to a later round).

_Last verified: 2026-08-13 (research round 3)._
