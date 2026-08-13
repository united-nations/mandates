# UN Secretariat — United Nations Secretariat, Special Political Missions and Peacekeeping Operations

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **Mandate Source Registry** (Mandate Registry) — </secretariat>

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes |
| 2 mandates (active) | yes |
| 3 budget-linked | no — budget *structure* is linked (programme/section) but no monetary amounts are shown (project decision) |
| 4 implementation-linked | no |
| 5 results-linked | no — no results reporting linked to mandates on this site; Secretariat performance reporting (programme performance reports, results.un.org) is not mandate-linked |
| 6 interoperability | deferred (later round) |

Re-confirmed round 3: the registry entry still describes this site accurately.

## Governing bodies

The four recorded bodies were re-verified in round 3. The empirical basis is
unchanged — the UN programme budget shows these four issue essentially all
Secretariat mandates (GA 2,154 citations, SC 471, ECOSOC 428, HRC 279; the next
bodies are an order of magnitude smaller and belong to separately-listed
entities).

| Body | URL | Round-3 status |
| --- | --- | --- |
| General Assembly | <https://www.un.org/en/ga/> | HTTP 200; GA Secretariat contact page <https://www.un.org/en/ga/about/secretariat.shtml> HTTP 200 |
| Security Council | <https://main.un.org/securitycouncil/en> | HTTP 200; Secretariat Branch contact <https://main.un.org/securitycouncil/en/content/secretariat-branch> HTTP 200 |
| Economic and Social Council | <https://ecosoc.un.org/en> | HTTP 200; ECOSOC Secretariat contact <https://ecosoc.un.org/en/about-us/contact> HTTP 200 |
| Human Rights Council | <https://www.ohchr.org/en/hrc-homepage> | live (ohchr.org returns HTTP 403 to non-browser clients; reachable in a browser) |

### The HRC status point

The four are presented as a flat list, which reads as "four principal organs".
Three of them are (Charter Art. 7). The **Human Rights Council is not** — it was
created by **General Assembly resolution 60/251 (2006) as a subsidiary organ of
the General Assembly**, replacing the Commission on Human Rights (which had been
an ECOSOC functional commission). It reports to the GA and its mandate is subject
to GA review.

That does not argue for removing it — it is a real mandating body with 279
citations in the programme budget, and its resolutions address the Secretariat
(OHCHR, special procedures, commissions of inquiry) directly. It argues for
**labelling**. The `bodies` dictionary already supports a `note` field (used on
`un-tc` for the Trusteeship Council's 1994 suspension), so the clean fix is a note
on the shared `un-hrc` entry rather than anything entity-specific — see the
round-3 return.

## Related portals (not linked to mandates)

None found beyond the universal UN portals — open.un.org (budget) and
results.un.org (results) exist for the Secretariat but are not mandate-linked.

## Notes

- This site itself. Budget *structure* is linked (programme/section) but no monetary amounts are shown anywhere — per project decision this does NOT count as budget-linked.
- Contacts for this row were **not** researched in round 3 (assigned to a separate agent).

## Open questions

- Point 6 interoperability (deferred to a later round).
- Whether budget amounts and results linkage get added to this site is a project roadmap question, not a survey question.

_Last verified: 2026-08-13 (research round 3, re-verification)._
