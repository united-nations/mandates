# ITLOS — International Tribunal for the Law of the Sea

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **None scored.** ITLOS is a judicial body, not a mandate-issuing governing body. Its own output is case law (judgments, advisory opinions, orders), a different category from governing-body mandates/decisions; its governing body, the Meeting of States Parties to UNCLOS (SPLOS), takes only administrative, financial (budget) and electoral decisions.

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | n/a as recorded — **but see the round-3 correction below**: SPLOS decisions *are* published as a findable per-meeting corpus. The judgement now rests entirely on "these are not mandates", not on "they cannot be found" |
| 2 mandates (active) | no — no active-vs-replaced tracking exists or would apply |
| 3 budget-linked | no — the SPLOS adopts the ITLOS budget as a numbered decision (36th Meeting: **SPLOS/36/12**, "Decision on budgetary matters of the International Tribunal for the Law of the Sea for the period 2027–2028"), published as a document, not linked to specific mandates |
| 4 implementation-linked | no |
| 5 results-linked | no |
| 6 interoperability | deferred (later round) |

## Round-3 correction: SPLOS decisions are findable

The round-2 note implied the SPLOS produces no findable decision corpus. That is
wrong and is corrected here. The DOALOS meeting pages publish a full numbered
document series per meeting. For the **36th Meeting of States Parties (15–19 June
2026)**, verified live:

| Symbol | Title |
| --- | --- |
| SPLOS/36/1 | Agenda |
| SPLOS/36/2 | Annual report of the Tribunal for 2025 |
| SPLOS/36/3 | Budgetary report by the Registrar |
| SPLOS/36/4 | External auditor report with 2025 financial statements |
| SPLOS/36/5 | Draft budget proposals for 2027–2028 |
| SPLOS/36/6–/11 | Election candidate lists, CVs, procedures, credentials |
| **SPLOS/36/12** | **Decision on budgetary matters … for the period 2027–2028** |
| SPLOS/36/13 | Report of the Meeting |

A cross-meeting document index exists at
<https://www.un.org/Depts/los/meeting_states_parties/SPLOS_documents.htm>
(HTTP 200) — a better `related` link than the meetings overview page currently
recorded.

**What this means for scoring.** Under the precedent set for UNCCD and UNAIDS
(per-session PDF listings score `documents = true`), a literal reading would give
ITLOS `documents = true` and a score of 1. The dossier keeps the null registry
because the corpus consists of budgetary, administrative and electoral decisions
rather than standing mandates to a secretariat — but this is now an explicit
judgement about *what counts as a mandate*, not a factual claim about
findability, and it is inconsistent with how comparably thin corpora were scored
elsewhere. Escalated as the main uncertainty of the round.

## Related portals (not linked to mandates)

- **List of Cases** — <https://www.itlos.org/en/main/cases/list-of-cases/> (HTTP 200) — structured docket of contentious cases and advisory proceedings, with pleadings, orders, judgments and advisory opinions per case; a case-law database, not a mandate registry.
- **Documents of the Meetings of States Parties (SPLOS)** — <https://www.un.org/Depts/los/meeting_states_parties/SPLOS_documents.htm> (HTTP 200). The meetings overview page currently recorded, <https://www.un.org/Depts/los/meeting_states_parties/meeting_states_parties.htm> (HTTP 200), is a navigation hub that points at it.

## Notes

- Round 3 link check: all four recorded URLs HTTP 200.
- The recorded governing-body URL <https://www.itlos.org/en/main/the-tribunal/states-parties/> was re-read and is **the right page**: despite the "states-parties" slug it is headed "Meetings of States Parties", quotes the Convention's requirement that the Secretary-General "convene necessary meetings of States Parties", notes 172 States Parties, announces the 15–19 June 2026 meeting with its advance documents, and links both DOALOS SPLOS pages.
- Round 3 contact: <https://www.itlos.org/en/special/contact/> verified — Office of the Registrar (Ms Ximena Hinrichs Oyarce), "+49 40 35607-268", `registraroffice@itlos.org`; general "+49 40 35607-0", `itlos@itlos.org`; press `press@itlos.org`. The Registry is the body that services the Tribunal and prepares the SPLOS budget documents, so the recorded contact is the correct one.
- The judgments-vs-mandates distinction remains the core point: a tribunal's "decisions" are adjudications binding on the parties to a case, not standing mandates that can be tracked as active/replaced/implemented.

## Open questions

- Whether a judicial body should carry a registry entry at all, given that its governing body's decisions *are* findable — see the correction above.

_Last verified: 2026-08-13 (research round 3, re-verification)._
