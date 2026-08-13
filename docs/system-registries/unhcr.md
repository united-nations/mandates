# UNHCR — Office of the United Nations High Commissioner for Refugees

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **ExCom documentation collection** (Documents Collection) — <https://www.unhcr.org/about-unhcr/governance-and-oversight/executive-committee/excom-plenary-sessions> — online collection of Executive Committee documents browsable by session (reports, conclusions, decisions).
- Supplementary compilations: *A Thematic Compilation of Executive Committee Conclusions* (7th ed., 2014, PDF, <https://www.unhcr.org/media/thematic-compilation-executive-committee-conclusions-7th-edition>) and UNHCR's Refworld legal database, which index ExCom Conclusions on International Protection.

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — ExCom session documents (agenda, conclusions, decisions, reports) compiled and publicly browsable by session; ExCom Conclusions additionally compiled thematically and in Refworld |
| 2 mandates (current vs replaced) | no — ExCom Conclusions on International Protection are cumulative soft-law guidance; the thematic compilation reorders them by topic but nothing marks conclusions or decisions as in force vs replaced/lapsed |
| 3 budget-linked | no — ExCom approves the annual programme budget target, but published budget/funding data is organized by operation, category and funding source, not by ExCom conclusion or decision |
| 4 implementation-linked | no — implementation is reported at strategic/operational level (COMPASS results framework, Global Report), not per ExCom conclusion/decision |
| 5 results-linked | no — outcomes reported against the five Strategic Directions and COMPASS indicators, not against specific ExCom decisions |
| 6 interoperability | deferred (later round) |

## Related portals (not linked to mandates)

- **Planning, funding and results** — <https://www.unhcr.org/about-unhcr/planning-funding-and-results> — live; interactive budget/funding/expenditure dashboard by operation, category and funding source (2026: budget $8.50B, contributions $2.27B, flexible funding $785M, funding gap $6.67B, multi-year funding $985M), plus Global Appeal / Global Report, annual country reports, underfunding, donors; also published as IATI. Organized by operation and strategic plan, not by ExCom decisions.
  - **Redirect changed.** `reporting.unhcr.org` now 301-redirects to the site root `https://www.unhcr.org/`, not to this page as recorded in the gap-fill round.
- **Operational Data Portal** — <https://data.unhcr.org/> — live; field/situation operational data.
- **Refugee Data Finder** — <https://www.unhcr.org/refugee-statistics> — population statistics.

## The General Assembly and ECOSOC belong here — the removal was wrong

Round 3's clearest finding. UNHCR is the one entity in this batch where the round-2 rationale ("the GA is merely constitutive; the Executive Board governs the programme and appropriates the budget") does not hold, on five independent grounds:

1. **UNHCR's own ExCom page says so.** "UNHCR's Statute [Article 3] directs that the High Commissioner 'shall follow policy directives given him by the General Assembly or the Economic and Social Council.' **ExCom does not substitute for the policy-making functions of the General Assembly or ECOSOC** but has its own executive and advisory functions."
2. **ExCom's own functions are advisory plus a budget *target*.** The four listed are: to advise the High Commissioner; to review funds and programmes; to authorize the High Commissioner to make appeals for funds; and "to approve proposed annual budget targets". A target is not an appropriation, and ExCom does not approve a programme budget in the sense UNDP's or UNICEF's Board does.
3. **The General Assembly appropriates a UNHCR budget section.** UNHCR is Part VI, **Section 25** of the UN programme budget, "International protection, durable solutions and assistance to refugees" — verified in our own PPB 2027 extraction. Only the GA appropriates it.
4. **The GA is the dominant source of UNHCR's cited mandates.** In the same extraction, 14 of the 22 legislative mandates cited for Section 25 are GA instruments, including res 428 (V) (the Statute itself), res 319 A (IV), res 1166 (XII), res 58/153, res 80/188 and the annual omnibus **A/RES/80/187 "Office of the United Nations High Commissioner for Refugees"**. The GA adopts a substantive UNHCR resolution every year.
5. **ExCom is a GA subsidiary organ.** Although ECOSOC established it (res 672 (XXV), 1958) at the GA's request (res 1166 (XII)), ExCom "functions as a subsidiary organ of the General Assembly, its documentation is issued in a General Assembly series [A/AC.96/-], and ExCom's report is submitted directly to the General Assembly for consideration in the Third Committee." Enlarging ExCom requires a GA resolution; ECOSOC then elects the new members.

Recommendation: restore the General Assembly and ECOSOC to `governingBodies`, keep ExCom, and replace the QCPR note (which is in any case a poor fit — UNHCR is not a QCPR development entity in the way UNDP/UNFPA/UNICEF are).

## Notes

- **Mandate is open-ended**, confirmed: GA res 58/153 (2003) removed the temporal limitation, extending the Office "until the refugee problem is solved". 58/153 is itself cited as a Section 25 legislative mandate.
- **Round-2 open question resolved:** the ExCom documentation collection exposes **no structured search or export**. The plenary-sessions page offers only "Consult the online collection of ExCom documents by session: Select from the list" — a session dropdown. This caps any future interoperability rating.
- **No 8th edition of the Thematic Compilation exists.** The 7th edition (June 2014) remains the latest; searched again in round 3. It is a periodically re-issued PDF, not a queryable system, and does not track in-force status — noted, not scored.
- Current ExCom facts: 110 members; 77th session scheduled Geneva, 12–16 October 2026; Bureau chaired by Bangladesh. Rules of Procedure A/AC.96/187/Rev.8.
- ExCom Secretariat contact confirmed: hqexcom@unhcr.org.
- unhcr.org sits behind a Cloudflare interstitial that returns HTTP 403 with a JS challenge to every non-interactive client; all pages above were verified through a headless browser session and are live. The 403s are bot blocking, not link rot.
- Score stays 1 of 5 (documents only): a findable document collection with no current-mandate registry and no decision-linked budget, implementation or results.

## Open questions

- Point 6 interoperability (deferred to a later round) — expected low, given the session-dropdown-only access.

_Last verified: 2026-08-13 (research round 3, re-verification)._
